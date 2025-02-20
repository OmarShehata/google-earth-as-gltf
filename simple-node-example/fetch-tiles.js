require('@loaders.gl/polyfills')
const { load } = require('@loaders.gl/core');
const { Tileset3D } = require('@loaders.gl/tiles');
const { Tiles3DLoader } = require('@loaders.gl/3d-tiles');
const { WebMercatorViewport } = require('@deck.gl/core');
const { writeFile } = require('fs/promises');
var fs = require('fs');

async function run() {
  const latitude = parseFloat(process.argv[2])
  const longitude = parseFloat(process.argv[3])
  const object_name = process.argv[4]
  if (isNaN(latitude) || isNaN(longitude) || (!object_name)) {
    console.error('❗️ usage: node fetch-tiles latitude longitude object_name');
    process.exit(1);
  }
  console.log(`fetch-tiles: (lat:${latitude},lon=${longitude}) -> ${object_name}`);

  const object_path = `${process.env.ABCLI_OBJECT_ROOT}/${object_name}`
  // https://stackoverflow.com/a/26815894/17619982
  if (!fs.existsSync(object_path)) {
    fs.mkdirSync(object_path, { recursive: true });
    console.log(`created ${object_path}`);
  }

  // Get your key:
  // https://developers.google.com/maps/documentation/tile/3d-tiles
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY
  const tilesetUrl = 'https://tile.googleapis.com/v1/3dtiles/root.json?key=' + GOOGLE_API_KEY;
  const screenSpaceError = 2
  const viewport = new WebMercatorViewport({
    width: 600,
    height: 400,
    latitude: latitude,
    longitude: longitude,
    zoom: 16
  });

  console.log("Fetching tileset...")
  const tilesetJson = await load(tilesetUrl, Tiles3DLoader);
  const tileset3d = new Tileset3D(tilesetJson, {
    throttleRequests: false,
    loadGLTF: false,
    loadOptions: {
      '3d-tiles': { loadGLTF: false },
    },
    maximumScreenSpaceError: screenSpaceError
  })
  console.log("Traversing....")
  let currentTilesLoadedNum = 0
  // Traverse until we've loaded all the tiles for the given viewport & screen space error threshold
  while (!tileset3d.isLoaded()) {
    if (tileset3d.tiles.length > currentTilesLoadedNum) {
      currentTilesLoadedNum = tileset3d.tiles.length
      console.log(`${currentTilesLoadedNum} tiles fetched...`)
    }
    await tileset3d.selectTiles(viewport)
  }
  // Sort the tiles so we get the ones with the smallest error first
  const tiles = tileset3d.tiles.sort((tileA, tileB) => {
    return tileA.header.geometricError - tileB.header.geometricError
  })

  // Fetch all the glTF's and write them to disk 
  const glbUrls = []
  const sessionKey = getSessionKey(tileset3d)
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]
    const url = `${tile.contentUrl}?key=${GOOGLE_API_KEY}&session=${sessionKey}`
    console.log(`Downloading glTF ${i}`)
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to fetch ${url}`)
      continue;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(`${object_path}/${i}.glb`, buffer);
  }

  // TODO: these glTF's are in ECEF coordinates
  // would be nice to port the code from Viewer.js here 
  // that can renormalize them and re-orient them
}

run()

function getSessionKey(tileset) {
  return new URL(`http://website.com?${tileset.queryParams}`).searchParams.get("session")
}
