# Music Genie DJ Plugin for Volumio

An AI-powered music service plugin for Volumio that generates and plays audio messages.

## Features

- Generate and play different types of audio messages:
  - Weather updates
  - Jokes
  - Shoutouts
- Configurable API host for the Music Genie service
- Seamless integration with Volumio's music player

## Configuration

1. Install the plugin through Volumio's plugin interface
2. Navigate to the plugin settings
3. Set the API host URL (e.g., `http://localhost:3000`)
4. Save settings

## Usage

1. Browse to "Music Genie DJ" in your Volumio music sources
2. Select the type of message you want to generate (Weather, Joke, or Shoutout)
3. The plugin will fetch the audio stream from the configured API and play it

## API Requirements

The plugin expects the Music Genie service to expose endpoints at:
- `/api/message/weather` - Returns audio/mpeg stream for weather updates
- `/api/message/joke` - Returns audio/mpeg stream for jokes
- `/api/message/shoutout` - Returns audio/mpeg stream for shoutouts

## Development

To install locally for development:
```bash
cd /data/plugins/music_service
mkdir music-genie-dj
cp -r /path/to/music-genie-dj/* music-genie-dj/
cd music-genie-dj
npm install
sudo systemctl restart volumio
```

## Licence

ISC
