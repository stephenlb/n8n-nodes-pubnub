import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import PubNubSDK from 'pubnub';

export class PubNubTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PubNub Trigger',
		name: 'pubNubTrigger',
		icon: 'file:PubNubTrigger.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when PubNub messages are received',
		defaults: {
			name: 'PubNub Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pubNubApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'options',
				options: [
					{
						name: 'Message',
						value: 'message',
						description: 'Trigger on new messages',
					},
					{
						name: 'Presence',
						value: 'presence',
						description: 'Trigger on presence events',
					},
					{
						name: 'Both',
						value: 'both',
						description: 'Trigger on both messages and presence events',
					},
				],
				default: 'message',
				description: 'What events should trigger the workflow',
			},
			{
				displayName: 'Channels',
				name: 'channels',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'my-channel,another-channel',
				description: 'Comma-separated list of channels to subscribe to',
			},
			{
				displayName: 'Channel Groups',
				name: 'channelGroups',
				type: 'string',
				default: '',
				placeholder: 'my-group,another-group',
				description: 'Comma-separated list of channel groups to subscribe to',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Filter Expression',
						name: 'filterExpression',
						type: 'string',
						default: '',
						placeholder: 'e.g., uuid != "my-uuid"',
						description: 'Filter expression to apply to incoming messages',
					},
					{
						displayName: 'With Presence',
						name: 'withPresence',
						type: 'boolean',
						default: false,
						description: 'Whether to also receive presence events for the channels',
					},
					{
						displayName: 'Time Token',
						name: 'timetoken',
						type: 'string',
						default: '',
						description: 'Start receiving messages from this timetoken',
					},
					{
						displayName: 'Include Message Actions',
						name: 'includeMessageActions',
						type: 'boolean',
						default: false,
						description: 'Whether to include message actions in the events',
					},
					{
						displayName: 'Include Metadata',
						name: 'includeMeta',
						type: 'boolean',
						default: false,
						description: 'Whether to include message metadata',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const triggerOn = this.getNodeParameter('triggerOn') as string;
		const channelsStr = this.getNodeParameter('channels') as string;
		const channelGroupsStr = this.getNodeParameter('channelGroups', '') as string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const options = this.getNodeParameter('options', {}) as any;

		// Parse channels and channel groups
		const channels = channelsStr
			? channelsStr.split(',').map((c) => c.trim()).filter((c) => c.length > 0)
			: [];
		const channelGroups = channelGroupsStr
			? channelGroupsStr.split(',').map((g) => g.trim()).filter((g) => g.length > 0)
			: [];

		// Validate that we have at least channels or channel groups
		if (channels.length === 0 && channelGroups.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'You must specify at least one channel or channel group',
			);
		}

		// Get credentials
		const credentials = await this.getCredentials('pubNubApi');

		// Initialize PubNub client
		const pubnub = new PubNubSDK({
			publishKey: credentials.publishKey as string,
			subscribeKey: credentials.subscribeKey as string,
			secretKey: (credentials.secretKey as string) || undefined,
			userId: (credentials.userId as string) || `n8n-trigger-${Date.now()}`,
			authKey: (credentials.authKey as string) || undefined,
			restore: options.timetoken ? true : false,
		});

		// Create subscription options
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const subscribeParams: any = {
			channels: channels.length > 0 ? channels : undefined,
			channelGroups: channelGroups.length > 0 ? channelGroups : undefined,
			withPresence: options.withPresence || false,
		};

		if (options.timetoken) {
			subscribeParams.timetoken = options.timetoken;
		}

		// Message listener
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const listener: any = {};

		// Handle messages
		if (triggerOn === 'message' || triggerOn === 'both') {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			listener.message = (messageEvent: any) => {
				const workflowData = [
					this.helpers.returnJsonArray({
						event: 'message',
						channel: messageEvent.channel,
						subscription: messageEvent.subscription,
						message: messageEvent.message,
						timetoken: messageEvent.timetoken,
						publisher: messageEvent.publisher,
						...(options.includeMeta && messageEvent.userMetadata
							? { metadata: messageEvent.userMetadata }
							: {}),
						...(options.includeMessageActions && messageEvent.actions
							? { actions: messageEvent.actions }
							: {}),
					}),
				];
				this.emit(workflowData);
			};

			// Handle signals (similar to messages but lighter)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			listener.signal = (signalEvent: any) => {
				const workflowData = [
					this.helpers.returnJsonArray({
						event: 'signal',
						channel: signalEvent.channel,
						subscription: signalEvent.subscription,
						message: signalEvent.message,
						timetoken: signalEvent.timetoken,
						publisher: signalEvent.publisher,
					}),
				];
				this.emit(workflowData);
			};

			// Handle message actions
			if (options.includeMessageActions) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				listener.messageAction = (actionEvent: any) => {
					const workflowData = [
						this.helpers.returnJsonArray({
							event: 'messageAction',
							channel: actionEvent.channel,
							data: actionEvent.data,
						}),
					];
					this.emit(workflowData);
				};
			}
		}

		// Handle presence events
		if (triggerOn === 'presence' || triggerOn === 'both' || options.withPresence) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			listener.presence = (presenceEvent: any) => {
				const workflowData = [
					this.helpers.returnJsonArray({
						event: 'presence',
						action: presenceEvent.action,
						channel: presenceEvent.channel,
						occupancy: presenceEvent.occupancy,
						state: presenceEvent.state,
						subscription: presenceEvent.subscription,
						timestamp: presenceEvent.timestamp,
						timetoken: presenceEvent.timetoken,
						uuid: presenceEvent.uuid,
					}),
				];
				this.emit(workflowData);
			};
		}

		// Handle status events (connection, errors, etc.)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		listener.status = (statusEvent: any) => {
			const category = statusEvent.category;

			// Log important status changes
			if (category === 'PNConnectedCategory') {
				console.log('PubNub Trigger: Connected successfully');
			} else if (category === 'PNNetworkDownCategory') {
				console.log('PubNub Trigger: Network is down');
			} else if (category === 'PNReconnectedCategory') {
				console.log('PubNub Trigger: Reconnected');
			} else if (
				category === 'PNUnexpectedDisconnectCategory' ||
				category === 'PNAccessDeniedCategory'
			) {
				console.error('PubNub Trigger: Connection issue', statusEvent);
			}
		};

		// Add listener and subscribe
		pubnub.addListener(listener);

		// Apply filter expression if provided
		if (options.filterExpression) {
			pubnub.setFilterExpression(options.filterExpression as string);
		}

		// Subscribe to channels
		pubnub.subscribe(subscribeParams);

		// Manual trigger function for testing
		const manualTriggerFunction = async () => {
			return new Promise<void>((resolve) => {
				const timeout = setTimeout(() => {
					resolve();
				}, 30000); // Wait up to 30 seconds for a message

				const tempListener = {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					message: (messageEvent: any) => {
						clearTimeout(timeout);
						const workflowData = [
							this.helpers.returnJsonArray({
								event: 'message',
								channel: messageEvent.channel,
								message: messageEvent.message,
								timetoken: messageEvent.timetoken,
								publisher: messageEvent.publisher,
							}),
						];
						this.emit(workflowData);
						resolve();
					},
				};

				pubnub.addListener(tempListener);
			});
		};

		// Cleanup function
		async function closeFunction() {
			console.log('PubNub Trigger: Unsubscribing and cleaning up');
			pubnub.removeListener(listener);
			pubnub.unsubscribeAll();
			pubnub.destroy();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
