import '@loaders.gl/polyfills';
import {load} from '@loaders.gl/core';
import {Tileset3D} from '@loaders.gl/tiles';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
import {WebMercatorViewport} from '@deck.gl/core';
import * as Url from 'url'
import fs from 'fs'
import path from 'path'
import https from 'https'

const viewer = new Viewer()

const viewport = new WebMercatorViewport({ 
  width: 600,
  height: 400,
  latitude: 40.7067584, 
  longitude: -74.0115413, 
  zoom: 17 
});


const GOOGLE_API_KEY = 'AIzaSyA3AzlFrIC-2byYauC7yFj3ajLKuhaD3N4'
const tilesetUrl = 'https://tile.googleapis.com/v1/3dtiles/root.json?key=' + GOOGLE_API_KEY;
// load3DTileset(tilesetUrl, viewport, (urls) => {
//   for (let i = 0; i < urls.length; i++) {
//     console.log(`Downloading ${i}.glb`)
//     // downloadURI(urls[i], `${i}.glb`)
//     viewer.loadGLTF(urls[i])
//   }
// })


async function load3DTileset(tilesetUrl, viewport, loadedCallback) {
  const TARGET_SCREEN_SPACE_ERROR = 2

  let sessionKey;
  const loadedTiles = []
  const tilesetJson = await load(tilesetUrl, Tiles3DLoader, {'3d-tiles': { loadGLTF: false }} );
  const tileset3d = new Tileset3D(tilesetJson, {
    maximumScreenSpaceError: TARGET_SCREEN_SPACE_ERROR,
    onTileLoad: (tile) => {
      // Extract session key so we can later fetch the glTF's 
      if (sessionKey == undefined && tile.content.url) {
        sessionKey = new URL(tile.content.url).searchParams.get("session")
      }
      console.log("Loaded tile with geometric error:", tile.header.geometricError)
      if (Math.abs(tile.header.geometricError - TARGET_SCREEN_SPACE_ERROR) <= 1) {
        const url = `${tile.contentUrl}?key=${GOOGLE_API_KEY}&session=${sessionKey}`
        loadedTiles.push(url)
      }
    }
  })

  async function traverse3DTileset() {
    await tileset3d.selectTiles(viewport)
    if (!tileset3d.isLoaded()) {
      setTimeout(traverse3DTileset, 100)
    } else {
      loadedCallback(loadedTiles)
    }
  }

  traverse3DTileset()
}


