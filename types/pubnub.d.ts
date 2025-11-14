declare module 'pubnub' {
	export default class PubNub {
		constructor(config: any);
		publish(params: any): Promise<any>;
		signal(params: any): Promise<any>;
		fetchMessages(params: any): Promise<any>;
		deleteMessages(params: any): Promise<any>;
		messageCounts(params: any): Promise<any>;
		hereNow(params: any): Promise<any>;
		whereNow(params: any): Promise<any>;
		setState(params: any): Promise<any>;
		getState(params: any): Promise<any>;
		addListener(listener: any): void;
		removeListener(listener: any): void;
		removeAllListeners(): void;
		subscribe(params: any): void;
		unsubscribe(params: any): void;
		unsubscribeAll(): void;
		setFilterExpression(expr: string): void;
		channel(name: string): any;
		destroy(): void;
		getUUID(): string;
		setUUID(uuid: string): void;
		channelGroups: {
			addChannels(params: any): Promise<any>;
			removeChannels(params: any): Promise<any>;
			listChannels(params: any): Promise<any>;
			deleteGroup(params: any): Promise<any>;
		};
	}
}
