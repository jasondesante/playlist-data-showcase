// Test with actual Arweave data format
const actualArweaveData = {
  "type": "Serverless-Playlist",
  "name": "City Stranger - Quicksand EP",
  "image": "https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg",
  "creator": "test-creator",
  "description": "Test playlist",
  "tracks": [
    {
      "chain_name": "AR",
      "tx_id": "_dWYG8LWCQK-ZM32ZFrs40m6PAsKYvBRgHFSBWDFMr0",
      "name": "fools spring_3-9-22_v19",
      "type": "track",
      "uuid": "61326da5-1b45-4c4c-b6c9-1e7152195f02",
      "playlist_index": 1,
      "metadata": "{\"name\":\"fools spring_3-9-22_v19\",\"artist\":\"City Stranger\",\"project\":{\"title\":\"Quicksand\",\"artwork\":{},\"artist\":\"City Stranger\",\"type\":\"ep\",\"original_release_date\":\"2024-11-01\",\"record_label\":\"Goodbye Cure Records\"},\"track_number\":1,\"audio_url\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/FOOLS-SPRING_PASS-7.wav\",\"mime_type\":\"audio/wav\",\"sample_rate\":48,\"bit_depth\":\"32\",\"duration\":211,\"isrc\":\"QZWFW2439283\",\"image\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg\",\"artwork\":{\"mime_type\":\"image/jpeg\",\"uri\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg\",\"small\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg-image_small\",\"thumb\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg-image_thumb\"},\"image_thumb\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg-image_thumb\",\"image_small\":\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg-image_small\",\"genre\":[\"pop\"],\"tags\":[\"modern rock\",\"alternative\",\"rock\"],\"mp3_url\":\"https://arweave.net/ja_9fwo8w3mS-fqPPJ4mQrkTxgx3uya46ZZsPS0xkyA\",\"images\":[\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/cs-plate.jpeg\",\"https://arweave.net/QH7cJzNf___VvxPOQgxL9kPULL5HOfj2esUzR3zi8mE/IMG_1599.JPG\"],\"attributes\":[{\"trait_type\":\"Title\",\"value\":\"fools spring_3-9-22_v19\"},{\"trait_type\":\"Artist\",\"value\":\"City Stranger\"},{\"trait_type\":\"Album\",\"value\":\"Quicksand\"},{\"trait_type\":\"Track Number\",\"value\":1},{\"trait_type\":\"Year\",\"value\":2024},{\"trait_type\":\"Audio Quality\",\"value\":\"48/32\"},{\"trait_type\":\"Rarity\",\"value\":\"Genesis\"},{\"trait_type\":\"Playlist Index\",\"value\":1},{\"trait_type\":\"Chain Name\",\"value\":\"AR\"},{\"trait_type\":\"Selected Mix\",\"value\":\"default\"}],\"rarity\":\"Genesis\"}"
    }
  ]
};

try {
  const engine = await import('/workspace/node_modules/playlist-data-engine/dist/playlist-data-engine.mjs');
  const parser = new engine.PlaylistParser();

  console.log('Testing with ACTUAL Arweave data format...');
  const result = await parser.parse(actualArweaveData);

  console.log('\n=== PARSING RESULT ===');
  console.log('Playlist name:', result.name);
  console.log('Number of tracks:', result.tracks.length);
  if (result.tracks.length > 0) {
    const track = result.tracks[0];
    console.log('\nFirst track:');
    console.log('  id:', track.id);
    console.log('  uuid:', track.uuid);
    console.log('  title:', track.title);
    console.log('  artist:', track.artist);
    console.log('  album:', track.album);
    console.log('  platform:', track.platform);
    console.log('  image_url:', track.image_url);
    console.log('  audio_url:', track.audio_url);
    console.log('  duration:', track.duration);
    console.log('  genre:', track.genre);
  }
} catch (error) {
  console.error('Error:', error.message);
}
