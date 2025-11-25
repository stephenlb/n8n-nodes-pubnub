import type {
    ITriggerFunctions,
    INodeType,
    INodeTypeDescription,
    ITriggerResponse,
    IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import PubNubClient from './pubnub';

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

        // Parse channels
        const channels = channelsStr
            ? channelsStr.split(',').map((c) => c.trim()).filter((c) => c.length > 0)
            : [];

        // Note: Channel groups not supported in simplified implementation
        // You would need to expand channels from groups using PubNub REST API
        if (channelGroupsStr) {
            throw new NodeOperationError(
                this.getNode(),
                'Channel groups not yet supported in this implementation. Please use direct channels.',
            );
        }

        // Validate that we have at least one channel
        if (channels.length === 0) {
            throw new NodeOperationError(
                this.getNode(),
                'You must specify at least one channel',
            );
        }

        // Get credentials
        const credentials = await this.getCredentials('pubNubApi');

        // Initialize PubNub client with configuration
        const pubnub = PubNubClient({
            subscribeKey: credentials.subscribeKey as string,
            publishKey: credentials.publishKey as string,
            userId: (credentials.userId as string) || `n8n-trigger-${Date.now()}`,
            authKey: (credentials.authKey as string) || undefined,
            httpHelper: this.helpers.httpRequest,
        });

        // Subscribe to each channel
        // Store subscriptions for cleanup
        const subscriptions: Array<{ unsubscribe: () => void; messages: (handler: (message: unknown) => void) => void }> = [];

        for (const channel of channels) {
            const subscription = pubnub.subscribe({
                channel,
                filter: options.filterExpression || '',
                timetoken: options.timetoken || '0',
                messages: (message: unknown) => {
                    // Handle messages based on trigger type
                    if (triggerOn === 'message' || triggerOn === 'both') {
                        const msgData = message as { metadata?: Record<string, unknown> };
                        const workflowData = [
                            this.helpers.returnJsonArray({
                                event: 'message',
                                channel,
                                message: message as IDataObject,
                                timestamp: Date.now(),
                                ...(options.includeMeta && msgData.metadata
                                    ? { metadata: msgData.metadata }
                                    : {}),
                            }),
                        ];
                        this.emit(workflowData);
                    }
                },
            });

            subscriptions.push(subscription);
        }

        // Manual trigger function for testing
        const manualTriggerFunction = async () => {
            // Wait for first message on any channel
            return new Promise<void>((resolve) => {
                const tempMessageHandler = (message: unknown) => {
                    const workflowData = [
                        this.helpers.returnJsonArray({
                            event: 'message',
                            channel: channels[0],
                            message: message as IDataObject,
                            timestamp: Date.now(),
                        }),
                    ];
                    this.emit(workflowData);
                    resolve();
                };

                // Temporarily override first subscription's message handler
                if (subscriptions.length > 0) {
                    subscriptions[0].messages(tempMessageHandler);
                }
            });
        };

        // Cleanup function
        async function closeFunction() {
            for (const subscription of subscriptions) {
                subscription.unsubscribe();
            }
        }

        return {
            closeFunction,
            manualTriggerFunction,
        };
    }
}
