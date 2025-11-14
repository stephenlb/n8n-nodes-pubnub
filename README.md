# n8n-nodes-pubnub

This is an n8n community node that provides integration with PubNub real-time messaging platform.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[PubNub](https://www.pubnub.com/) is a real-time communication platform for building live chat, multiplayer games, IoT device control, and other real-time features.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-pubnub` in **Enter npm package name**
4. Click **Install**

### Manual Installation

To use this package in your n8n instance, you can install it via npm:

```bash
npm install n8n-nodes-pubnub
```

## Credentials

To use this node, you'll need to configure your PubNub credentials:

1. **Publish Key**: Your PubNub Publish Key (required for publishing messages)
2. **Subscribe Key**: Your PubNub Subscribe Key (required for subscribing to channels)
3. **Secret Key**: Optional secret key for encryption and access manager
4. **User ID**: Optional unique identifier for this client (auto-generated if not provided)

You can find your keys in the [PubNub Admin Portal](https://admin.pubnub.com/).

## Nodes

This package provides two nodes:

### 1. PubNub Node

The main node for interacting with PubNub. Supports the following operations:

#### Message Operations
- **Publish**: Send a message to a channel
  - Supports metadata, TTL, and history storage options
- **Signal**: Send a lightweight signal (max 30 characters)

#### History Operations
- **Fetch Messages**: Retrieve message history from a channel
  - Supports pagination, metadata, and message actions
- **Delete Messages**: Delete messages from a channel
- **Message Counts**: Get message counts for channels

#### Presence Operations
- **Here Now**: Get current occupancy and user list for channels
- **Where Now**: Get channels where a specific user is present
- **Set State**: Set state data for a user on channels
- **Get State**: Get state data for a user on channels

#### Channel Group Operations
- **Add Channels**: Add channels to a channel group
- **Remove Channels**: Remove channels from a channel group
- **List Channels**: List all channels in a channel group
- **Delete Group**: Delete a channel group

### 2. PubNub Trigger Node

A trigger node that starts your workflow when PubNub events occur:

- **Trigger On**: Choose to trigger on messages, presence events, or both
- **Channels**: Subscribe to specific channels (comma-separated)
- **Channel Groups**: Subscribe to channel groups (comma-separated)

#### Options:
- **Filter Expression**: Apply message filtering
- **With Presence**: Receive presence events
- **Time Token**: Start receiving messages from a specific timetoken
- **Include Message Actions**: Include message actions in events
- **Include Metadata**: Include message metadata

## Usage Examples

### Example 1: Publish a Message

1. Add a **PubNub** node to your workflow
2. Select **Message** resource and **Publish** operation
3. Enter your channel name (e.g., `my-channel`)
4. Enter your message as JSON: `{"text": "Hello World!", "timestamp": "{{$now}}"}`
5. Configure credentials and execute

### Example 2: Subscribe to Real-time Messages

1. Add a **PubNub Trigger** node to start your workflow
2. Set **Trigger On** to **Message**
3. Enter channel name(s) (e.g., `chat-room,notifications`)
4. Configure credentials
5. Activate the workflow - it will now trigger whenever messages arrive

### Example 3: Check Channel Presence

1. Add a **PubNub** node
2. Select **Presence** resource and **Here Now** operation
3. Enter channel name(s)
4. Enable options: **Include UUIDs** and **Include State**
5. Execute to see who's currently online

### Example 4: Fetch Message History

1. Add a **PubNub** node
2. Select **History** resource and **Fetch Messages** operation
3. Enter channel name
4. Set count to desired number of messages (e.g., 50)
5. Enable **Include Metadata** if needed
6. Execute to retrieve historical messages

## Development

To develop or modify this package:

```bash
# Clone the repository
git clone https://github.com/your-username/n8n-nodes-pubnub.git
cd n8n-nodes-pubnub

# Install dependencies
npm install

# Build the package
npm run build

# Watch for changes during development
npm run dev
```

## Resources

- [PubNub Documentation](https://www.pubnub.com/docs/)
- [PubNub JavaScript SDK](https://www.pubnub.com/docs/sdks/javascript)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Creating Nodes](https://docs.n8n.io/integrations/creating-nodes/)

## Version History

### 0.1.0
- Initial release
- PubNub node with message, history, presence, and channel group operations
- PubNub Trigger node for real-time subscriptions
- Full credential support with auto-generated User ID fallback

## License

[MIT](LICENSE.md)

## Support

If you encounter issues or have questions:

1. Check the [PubNub Documentation](https://www.pubnub.com/docs/)
2. Visit the [n8n Community Forum](https://community.n8n.io/)
3. Open an issue on [GitHub](https://github.com/your-username/n8n-nodes-pubnub/issues)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
