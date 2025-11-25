// ---------------------------------------------
// PubNub Client for n8n using REST API
// ---------------------------------------------
// - - - - - - - - - - - - - - - - - - - - - - -
// Features
// - - - - - - - - - - - - - - - - - - - - - - -
//  - Publish/Subscribe/Signal via REST API
//  - Long-polling subscribe
//  - Dedicated queue per channel for maximum performance
//  - Uses n8n HTTP helpers for requests
//  - No external dependencies

import type { IHttpRequestOptions } from 'n8n-workflow';

// Types
type HttpHelper = (requestOptions: IHttpRequestOptions) => Promise<unknown>;

type PubNubMessage = string | number | boolean | null | PubNubMessage[] | { [key: string]: PubNubMessage };

interface PubNubConfig {
    subscribeKey?: string;
    publishKey?: string;
    channel?: string;
    origin?: string;
    userId?: string;
    authKey?: string;
    messages?: (message: PubNubMessage) => void;
    filter?: string;
    timetoken?: string;
    message?: unknown;
    metadata?: Record<string, unknown>;
    httpHelper?: HttpHelper;
}

interface PubNubSubscription {
    messages: (receiver: (message: PubNubMessage) => void) => void;
    unsubscribe: () => void;
    [Symbol.asyncIterator](): AsyncIterator<PubNubMessage>;
}

interface PubNubInstance {
    subscribe: (setup?: PubNubConfig) => PubNubSubscription;
    publish: (setup?: PubNubConfig) => Promise<unknown>;
    signal: (setup?: PubNubConfig) => Promise<unknown>;
    subscribeKey?: string;
    publishKey?: string;
    channel?: string;
    origin?: string;
    userId?: string;
    authKey?: string;
    messages?: (message: PubNubMessage) => void;
    filter?: string;
    metadata?: Record<string, unknown>;
    httpHelper?: HttpHelper;
}

// PubNub Client Factory
function PubNub(setup: PubNubConfig): PubNubInstance {
    const instance = {
        subscribe: PubNubSubscribe,
        publish: PubNubPublish,
        signal: PubNubSignal,
    } as PubNubInstance;

    for (const key of Object.keys(setup)) {
        (instance as unknown as Record<string, unknown>)[key] = setup[key as keyof PubNubConfig];
    }

    return instance;
}

const defaultSubkey = 'demo';
const defaultPubkey = 'demo';
const defaultChannel = 'pubnub';
const defaultUserId = 'user-default';
const defaultAuthKey = 'user-default';
const defaultOrigin = 'ps.pndsn.com';

function PubNubSubscribe(this: PubNubInstance, setup: PubNubConfig = {}): PubNubSubscription {
    const subkey = setup.subscribeKey || this.subscribeKey || defaultSubkey;
    const channel = setup.channel || this.channel || defaultChannel;
    const origin = setup.origin || this.origin || defaultOrigin;
    const uuid = setup.userId || this.userId || defaultUserId;
    const authkey = setup.authKey || this.authKey || defaultAuthKey;
    const httpHelper = setup.httpHelper || this.httpHelper;
    let messages = setup.messages || this.messages || ((_m: PubNubMessage) => {});
    const filter = setup.filter || this.filter || '';
    let timetoken = setup.timetoken || '0';
    let region = '';

    if (!httpHelper) {
        throw new Error('HTTP helper is required for PubNub subscribe');
    }

    const ensuredHttpHelper = httpHelper;
    let resolver: ((data: PubNubMessage) => void) | null = null;
    const promissory = () => new Promise<PubNubMessage>((resolve) => (resolver = (data: PubNubMessage) => resolve(data)));
    let receiver = promissory();
    let subscribed = true;
    let aborted = false;

    // Start long-polling
    startLongPoll();

    async function startLongPoll() {
        while (subscribed && !aborted) {
            try {
                await poll();
            } catch (e) {
                if (!subscribed || aborted) break;
                // Wait 1 second before retrying on error
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }

    async function poll() {
        if (!subscribed || aborted) return;

        const url = `https://${origin}/v2/subscribe/${subkey}/${encodeURIComponent(channel)}/0`;

        const params: Record<string, string> = {
            uuid: uuid,
            tt: timetoken,
            auth: authkey,
        };

        if (region) {
            params.tr = region;
        }

        if (filter) {
            params['filter-expr'] = filter;
        }

        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');

        try {
            const response = await ensuredHttpHelper({
                url: `${url}?${queryString}`,
                method: 'GET',
                json: true,
                timeout: 310000, // 310 seconds to allow for long-polling (PubNub default is 300s)
            }) as { t?: { t?: string; r?: number }; m?: Array<{ d: PubNubMessage }> };

            if (!subscribed || aborted) return;

            // Parse response
            if (response && response.t) {
                // Update timetoken and region for next call
                if (response.t.t) {
                    timetoken = response.t.t;
                }
                if (response.t.r !== undefined) {
                    region = response.t.r.toString();
                }

                // Process messages
                if (response.m && Array.isArray(response.m)) {
                    response.m.forEach((msgEnvelope: { d: PubNubMessage }) => {
                        const message = msgEnvelope.d;
                        messages(message);
                        if (resolver) {
                            resolver(message);
                        }
                        receiver = promissory();
                    });
                }
            }
        } catch (error: unknown) {
            if (!subscribed || aborted) return;

            // Check if it's a timeout (which is expected for long-polling)
            const err = error as { code?: string };
            if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                // This is normal for long-polling, continue
                return;
            }

            // For other errors, wait before retrying
            throw error;
        }
    }

    // Subscription Structure
    async function* subscription() {
        while (subscribed && !aborted) {
            yield await receiver;
        }
    }

    const generator = subscription();
    const iterator = {
        ...generator,
        messages: (receiver: (message: PubNubMessage) => void) => (messages = receiver),
        unsubscribe: () => {
            subscribed = false;
            aborted = true;
        },
    } as PubNubSubscription;

    // Return Async Generator Iterator
    return iterator;
}

async function PubNubPublish(this: PubNubInstance, setup: PubNubConfig = {}): Promise<unknown> {
    const pubkey = setup.publishKey || this.publishKey || defaultPubkey;
    const subkey = setup.subscribeKey || this.subscribeKey || defaultSubkey;
    const channel = setup.channel || this.channel || defaultChannel;
    const authkey = setup.authKey || this.authKey || defaultAuthKey;
    const origin = setup.origin || this.origin || defaultOrigin;
    const uuid = setup.userId || this.userId || defaultUserId;
    const httpHelper = setup.httpHelper || this.httpHelper;
    const message = setup.message || 'missing-message';
    const metadata = setup.metadata || this.metadata || {};

    if (!httpHelper) {
        throw new Error('HTTP helper is required for PubNub publish');
    }

    const url = `https://${origin}/publish/${pubkey}/${subkey}/0/${encodeURIComponent(channel)}/0`;

    const params: Record<string, string> = {
        uuid: uuid,
        auth: authkey,
    };

    // Only add meta if metadata is not empty
    if (metadata && Object.keys(metadata).length > 0) {
        params.meta = encodeURIComponent(JSON.stringify(metadata));
    }

    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    try {
        const response = await httpHelper({
            url: `${url}?${queryString}`,
            method: 'POST',
            body: message,
            json: true,
        });

        return response;
    } catch (e) {
        return false;
    }
}

async function PubNubSignal(this: PubNubInstance, setup: PubNubConfig = {}): Promise<unknown> {
    const pubkey = setup.publishKey || this.publishKey || defaultPubkey;
    const subkey = setup.subscribeKey || this.subscribeKey || defaultSubkey;
    const channel = setup.channel || this.channel || defaultChannel;
    const authkey = setup.authKey || this.authKey || defaultAuthKey;
    const origin = setup.origin || this.origin || defaultOrigin;
    const uuid = setup.userId || this.userId || defaultUserId;
    const httpHelper = setup.httpHelper || this.httpHelper;
    const message = setup.message || '';

    if (!httpHelper) {
        throw new Error('HTTP helper is required for PubNub signal');
    }

    // Signals have a 30-character limit
    const signalMessage = String(message).substring(0, 30);

    const url = `https://${origin}/signal/${pubkey}/${subkey}/0/${encodeURIComponent(channel)}/0/${encodeURIComponent(signalMessage)}`;

    const params: Record<string, string> = {
        uuid: uuid,
        auth: authkey,
    };

    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    try {
        const response = await httpHelper({
            url: `${url}?${queryString}`,
            method: 'GET',
            json: true,
        });

        return response;
    } catch (e) {
        return false;
    }
}

// Export for Node.js/TypeScript
export default PubNub;
