# 7DTD Monitor (JS version)

A JavaScript-based monitor for 7 Days to Die servers, providing real-time updates and notifications.

## Features

- Monitor player join and leave events
- Send notifications to Discord
- Update player information in Home Assistant
- Check for blood moon warnings
- Docker support for easy deployment

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Docker (optional, for containerized deployment)

## Setup

1. Install Bun:
```
curl -fsSL https://bun.sh/install | bash
```

2. Clone the repository and navigate to the project directory.

3. Install dependencies:
```
bun install
```

4. Set up environment variables:
   Create a `.env` file in the project root and add the following variables:
   ```
   CONTAINER_NAME=your_7dtd_container_name
   HASS_URL=your_home_assistant_url
   HASS_TOKEN=your_home_assistant_token
   DISCORD_WEBHOOK_URL=your_discord_webhook_url
   GAME_SERVER_HOST=your_game_server_host
   GAME_SERVER_API_PORT=your_game_server_api_port
   GAME_SERVER_API_TOKEN_NAME=your_api_token_name
   GAME_SERVER_API_SECRET=your_api_secret
   LOG_LEVEL=info
   ```

5. Run the application:
```
bun index.ts
```

## Docker Deployment

To deploy using Docker:

1. Build the Docker image:
```
docker build -t 7dtd-monitor .
```

2. Run the container:
```
docker-compose up -d
```

## Troubleshooting

### Can't install dependencies

If you encounter an error while installing dependencies, such as:
```
TypeError: Executable not found in $PATH: "cc"
error: install script from "cpu-features" exited with 1
```
You may be missing the GCC compiler in your system. To add it, follow these steps:
```
sudo apt-get update
sudo apt-get install gcc
```
Then try installing the dependencies again.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).