import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import PubNubSDK from 'pubnub';

export class PubNub implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PubNub',
		name: 'pubNub',
		icon: 'file:PubNub.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with PubNub real-time messaging platform',
		defaults: {
			name: 'PubNub',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'pubNubApi',
				required: true,
			},
		],
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'History',
						value: 'history',
					},
					{
						name: 'Presence',
						value: 'presence',
					},
					{
						name: 'Channel Group',
						value: 'channelGroup',
					},
				],
				default: 'message',
				description: 'The resource to operate on',
			},

			// ========================================
			// MESSAGE OPERATIONS
			// ========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Publish',
						value: 'publish',
						description: 'Publish a message to a channel',
						action: 'Publish a message',
					},
					{
						name: 'Signal',
						value: 'signal',
						description: 'Send a signal (lightweight message, max 30 characters)',
						action: 'Send a signal',
					},
				],
				default: 'publish',
			},

			// MESSAGE: Channel
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['publish', 'signal'],
					},
				},
				default: '',
				placeholder: 'my-channel',
				description: 'The channel name to publish to',
			},

			// MESSAGE: Publish - Message Content
			{
				displayName: 'Message',
				name: 'message',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['publish'],
					},
				},
				default: '{}',
				description: 'The message content to publish (JSON object, string, or number)',
			},

			// MESSAGE: Signal - Message Content
			{
				displayName: 'Signal',
				name: 'signalMessage',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['signal'],
					},
				},
				default: '',
				placeholder: 'Hi',
				description: 'Signal message (max 30 characters)',
			},

			// MESSAGE: Publish Options
			{
				displayName: 'Options',
				name: 'publishOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['publish'],
					},
				},
				options: [
					{
						displayName: 'Store in History',
						name: 'storeInHistory',
						type: 'boolean',
						default: true,
						description: 'Whether to store this message in history',
					},
					{
						displayName: 'Meta',
						name: 'meta',
						type: 'json',
						default: '{}',
						description: 'Metadata to attach to the message',
					},
					{
						displayName: 'TTL',
						name: 'ttl',
						type: 'number',
						default: 0,
						description: 'Time to live for message (in hours). 0 means unlimited.',
					},
				],
			},

			// ========================================
			// HISTORY OPERATIONS
			// ========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['history'],
					},
				},
				options: [
					{
						name: 'Fetch Messages',
						value: 'fetchMessages',
						description: 'Fetch message history from a channel',
						action: 'Fetch message history',
					},
					{
						name: 'Delete Messages',
						value: 'deleteMessages',
						description: 'Delete messages from a channel',
						action: 'Delete messages',
					},
					{
						name: 'Message Counts',
						value: 'messageCounts',
						description: 'Get message counts for channels',
						action: 'Get message counts',
					},
				],
				default: 'fetchMessages',
			},

			// HISTORY: Channel
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['history'],
					},
				},
				default: '',
				placeholder: 'my-channel',
				description: 'The channel name',
			},

			// HISTORY: Fetch Options
			{
				displayName: 'Options',
				name: 'historyOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['history'],
						operation: ['fetchMessages'],
					},
				},
				options: [
					{
						displayName: 'Count',
						name: 'count',
						type: 'number',
						default: 100,
						description: 'Number of messages to return (max 100)',
					},
					{
						displayName: 'Start Timetoken',
						name: 'start',
						type: 'string',
						default: '',
						description: 'Timetoken to start from',
					},
					{
						displayName: 'End Timetoken',
						name: 'end',
						type: 'string',
						default: '',
						description: 'Timetoken to end at',
					},
					{
						displayName: 'Include Metadata',
						name: 'includeMeta',
						type: 'boolean',
						default: false,
						description: 'Whether to include message metadata',
					},
					{
						displayName: 'Include Message Actions',
						name: 'includeMessageActions',
						type: 'boolean',
						default: false,
						description: 'Whether to include message actions',
					},
				],
			},

			// ========================================
			// PRESENCE OPERATIONS
			// ========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['presence'],
					},
				},
				options: [
					{
						name: 'Here Now',
						value: 'hereNow',
						description: 'Get current occupancy information for channels',
						action: 'Get current occupancy',
					},
					{
						name: 'Where Now',
						value: 'whereNow',
						description: 'Get channels where a user is present',
						action: 'Get user presence',
					},
					{
						name: 'Set State',
						value: 'setState',
						description: 'Set state data for a user on channels',
						action: 'Set user state',
					},
					{
						name: 'Get State',
						value: 'getState',
						description: 'Get state data for a user on channels',
						action: 'Get user state',
					},
				],
				default: 'hereNow',
			},

			// PRESENCE: Channels (for hereNow, setState, getState)
			{
				displayName: 'Channels',
				name: 'channels',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['presence'],
						operation: ['hereNow', 'setState', 'getState'],
					},
				},
				default: '',
				placeholder: 'channel1,channel2',
				description: 'Comma-separated list of channels. Leave empty for global here now.',
			},

			// PRESENCE: UUID (for whereNow, setState, getState)
			{
				displayName: 'UUID',
				name: 'uuid',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['presence'],
						operation: ['whereNow', 'setState', 'getState'],
					},
				},
				default: '',
				description: 'The UUID of the user. Leave empty to use the authenticated user.',
			},

			// PRESENCE: State (for setState)
			{
				displayName: 'State',
				name: 'state',
				type: 'json',
				required: true,
				displayOptions: {
					show: {
						resource: ['presence'],
						operation: ['setState'],
					},
				},
				default: '{}',
				description: 'State object to set for the user',
			},

			// PRESENCE: Options
			{
				displayName: 'Options',
				name: 'presenceOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['presence'],
						operation: ['hereNow'],
					},
				},
				options: [
					{
						displayName: 'Include UUIDs',
						name: 'includeUUIDs',
						type: 'boolean',
						default: true,
						description: 'Whether to include UUID list in response',
					},
					{
						displayName: 'Include State',
						name: 'includeState',
						type: 'boolean',
						default: false,
						description: 'Whether to include state information',
					},
				],
			},

			// ========================================
			// CHANNEL GROUP OPERATIONS
			// ========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['channelGroup'],
					},
				},
				options: [
					{
						name: 'Add Channels',
						value: 'addChannels',
						description: 'Add channels to a channel group',
						action: 'Add channels to group',
					},
					{
						name: 'Remove Channels',
						value: 'removeChannels',
						description: 'Remove channels from a channel group',
						action: 'Remove channels from group',
					},
					{
						name: 'List Channels',
						value: 'listChannels',
						description: 'List all channels in a channel group',
						action: 'List channels in group',
					},
					{
						name: 'Delete Group',
						value: 'deleteGroup',
						description: 'Delete a channel group',
						action: 'Delete channel group',
					},
				],
				default: 'listChannels',
			},

			// CHANNEL GROUP: Group Name
			{
				displayName: 'Channel Group',
				name: 'channelGroup',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['channelGroup'],
					},
				},
				default: '',
				placeholder: 'my-group',
				description: 'The channel group name',
			},

			// CHANNEL GROUP: Channels
			{
				displayName: 'Channels',
				name: 'channels',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['channelGroup'],
						operation: ['addChannels', 'removeChannels'],
					},
				},
				default: '',
				placeholder: 'channel1,channel2',
				description: 'Comma-separated list of channels',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('pubNubApi');

		// Initialize PubNub client
		const pubnub = new PubNubSDK({
			publishKey: credentials.publishKey as string,
			subscribeKey: credentials.subscribeKey as string,
			secretKey: (credentials.secretKey as string) || undefined,
			userId: (credentials.userId as string) || `n8n-user-${Date.now()}`,
			authKey: (credentials.authKey as string) || undefined,
		});

		try {
			for (let i = 0; i < items.length; i++) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let responseData: any = {};

					// ========================================
					// MESSAGE RESOURCE
					// ========================================
					if (resource === 'message') {
						const channel = this.getNodeParameter('channel', i) as string;

						if (operation === 'publish') {
							const message = this.getNodeParameter('message', i);
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const options = this.getNodeParameter('publishOptions', i, {}) as any;

							responseData = await pubnub.publish({
								channel,
								message,
								storeInHistory: options.storeInHistory ?? true,
								meta: options.meta || undefined,
								ttl: options.ttl || undefined,
							});
						} else if (operation === 'signal') {
							const signalMessage = this.getNodeParameter('signalMessage', i) as string;

							responseData = await pubnub.signal({
								channel,
								message: signalMessage,
							});
						}
					}

					// ========================================
					// HISTORY RESOURCE
					// ========================================
					else if (resource === 'history') {
						const channel = this.getNodeParameter('channel', i) as string;

						if (operation === 'fetchMessages') {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const options = this.getNodeParameter('historyOptions', i, {}) as any;

							responseData = await pubnub.fetchMessages({
								channels: [channel],
								count: options.count || 100,
								start: options.start || undefined,
								end: options.end || undefined,
								includeMeta: options.includeMeta || false,
								includeMessageActions: options.includeMessageActions || false,
							});
						} else if (operation === 'deleteMessages') {
							responseData = await pubnub.deleteMessages({
								channel,
							});
						} else if (operation === 'messageCounts') {
							responseData = await pubnub.messageCounts({
								channels: [channel],
							});
						}
					}

					// ========================================
					// PRESENCE RESOURCE
					// ========================================
					else if (resource === 'presence') {
						if (operation === 'hereNow') {
							const channelsStr = this.getNodeParameter('channels', i, '') as string;
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							const options = this.getNodeParameter('presenceOptions', i, {}) as any;
							const channels = channelsStr ? channelsStr.split(',').map((c) => c.trim()) : [];

							responseData = await pubnub.hereNow({
								channels: channels.length > 0 ? channels : undefined,
								includeUUIDs: options.includeUUIDs ?? true,
								includeState: options.includeState ?? false,
							});
						} else if (operation === 'whereNow') {
							const uuid = this.getNodeParameter('uuid', i, '') as string;

							responseData = await pubnub.whereNow({
								uuid: uuid || undefined,
							});
						} else if (operation === 'setState') {
							const channelsStr = this.getNodeParameter('channels', i) as string;
							const uuid = this.getNodeParameter('uuid', i, '') as string;
							const state = this.getNodeParameter('state', i) as object;
							const channels = channelsStr.split(',').map((c) => c.trim());

							responseData = await pubnub.setState({
								channels,
								uuid: uuid || undefined,
								state,
							});
						} else if (operation === 'getState') {
							const channelsStr = this.getNodeParameter('channels', i) as string;
							const uuid = this.getNodeParameter('uuid', i, '') as string;
							const channels = channelsStr.split(',').map((c) => c.trim());

							responseData = await pubnub.getState({
								channels,
								uuid: uuid || undefined,
							});
						}
					}

					// ========================================
					// CHANNEL GROUP RESOURCE
					// ========================================
					else if (resource === 'channelGroup') {
						const channelGroup = this.getNodeParameter('channelGroup', i) as string;

						if (operation === 'addChannels') {
							const channelsStr = this.getNodeParameter('channels', i) as string;
							const channels = channelsStr.split(',').map((c) => c.trim());

							responseData = await pubnub.channelGroups.addChannels({
								channels,
								channelGroup,
							});
						} else if (operation === 'removeChannels') {
							const channelsStr = this.getNodeParameter('channels', i) as string;
							const channels = channelsStr.split(',').map((c) => c.trim());

							responseData = await pubnub.channelGroups.removeChannels({
								channels,
								channelGroup,
							});
						} else if (operation === 'listChannels') {
							responseData = await pubnub.channelGroups.listChannels({
								channelGroup,
							});
						} else if (operation === 'deleteGroup') {
							responseData = await pubnub.channelGroups.deleteGroup({
								channelGroup,
							});
						}
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray([responseData]),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as Error).message },
							pairedItem: { item: i },
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex: i,
						description: `Error in ${resource}:${operation} operation`,
					});
				}
			}

			return [returnData];
		} finally {
			// Cleanup PubNub connection
			pubnub.destroy();
		}
	}
}
