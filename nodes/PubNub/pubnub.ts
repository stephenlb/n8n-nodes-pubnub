// ---------------------------------------------
// PubNub Client for n8n using REST API
// ---------------------------------------------
// - - - - - - - - - - - - - - - - - - - - - - -
// Features
// - - - - - - - - - - - - - - - - - - - - - - -
//  - Publish/Subscribe via REST API
//  - Long-polling subscribe
//  - Dedicated queue per channel for maximum performance
//  - Uses n8n HTTP helpers for requests
//  - No external dependencies

import type { IHttpRequestOptions } from 'n8n-workflow';

// Types
type HttpHelper = (requestOptions: IHttpRequestOptions) => Promise<unknown>;

interface PubNubMessage {
    [key: string]: unknown;
}

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
        meta: JSON.stringify(metadata),
    };

    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

    try {
        const response = await httpHelper({
            url: `${url}?${queryString}`,
            method: 'POST',
            body: JSON.stringify(message),
            headers: {
                'Content-Type': 'application/json',
            },
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
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
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
