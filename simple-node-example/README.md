# Simple NodeJS example

`fetch-tiles.js` contains a minimal example for fetching tiles from the [Google Photorealistic 3D Tiles API](https://developers.google.com/maps/documentation/tile/3d-tiles), for a given area. 

Just add your API key here:

```javascript
const GOOGLE_API_KEY = "ADD_YOUR_API_KEY_HERE"
```

Run `npm install` and run the script:

```
node fetch-tiles.js
```

This will write all fetched tiles to disk. They are in their original geographic coordinates (ECEF). 