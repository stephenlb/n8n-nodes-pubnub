import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class PubNubApi implements ICredentialType {
	name = 'pubNubApi';
	displayName = 'PubNub API';
	documentationUrl = 'https://www.pubnub.com/docs/';
	icon: Icon = 'file:pubnub.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Publish Key',
			name: 'publishKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your PubNub Publish Key - required for publishing messages',
		},
		{
			displayName: 'Subscribe Key',
			name: 'subscribeKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your PubNub Subscribe Key - required for subscribing to channels',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Optional Secret Key for Access Manager and message encryption',
		},
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			placeholder: 'e.g., user-12345',
			description: 'Unique identifier for this client. If not provided, will be auto-generated.',
		},
	];

	// PubNub uses REST API with keys in URL/query params, not header auth
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	// Test credentials by checking subscribe key validity
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://ps.pndsn.com',
			url: '=/v2/presence/sub-key/{{$credentials.subscribeKey}}/channel/test-channel',
			method: 'GET',
		},
	};
}
