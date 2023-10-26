
(async () => {
  Cesium.Ion.defaultAccessToken = process.env.CESIUM_ACCESS_TOKEN;
  Cesium.GoogleMaps.defaultApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const viewer = new Cesium.Viewer("cesiumContainer", {
    timeline: false,
    animation: false,
    globe: false,
  });

  try {
    const tileset = await Cesium.createGooglePhotorealistic3DTileset();
    viewer.scene.primitives.add(tileset);
  } catch (error) {
    console.log(`Failed to load tileset: ${error}`);
  }

  const authentication = arcgisRest.ApiKeyManager.fromKey(process.env.ARCGIS_API_KEY);

  async function getServiceArea(cartographic) {
    const coordinates = [
      Cesium.Math.toDegrees(cartographic.longitude),
      Cesium.Math.toDegrees(cartographic.latitude),
    ];

    let geojson;
    try {
      const response = await arcgisRest.serviceArea({
        facilities: [coordinates],
        authentication,
      });
      
      geojson = response.saPolygons.geoJson;
    } catch (error) {
      console.log(`Failed to load service area: ${error}`);
    }

    if (!Cesium.defined(geojson)) {
      return;
    }

    let dataSource;
    try {
      dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
        clampToGround: true,
      });
      viewer.dataSources.add(dataSource);
    } catch (error) {
      console.log(`Failed to load geojson: ${error}`);
    }

    if (!Cesium.defined(dataSource)) {
      return;
    }
  

    const entities = dataSource.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const feature = entities[i];
      feature.polygon.outline = false;

      if (feature.properties.FromBreak === 0) {
        feature.polygon.material = Cesium.Color.fromHsl(
          0.5833,
          0.8,
          0.9,
          0.5
        );
      } else if (feature.properties.FromBreak === 5) {
        feature.polygon.material = Cesium.Color.fromHsl(
          0.5833,
          0.9,
          0.7,
          0.5
        );
      } else {
        feature.polygon.material = Cesium.Color.fromHsl(
          0.5833,
          1.0,
          0.4,
          0.5
        );
      }
    }
  }

  const marker = viewer.entities.add({
    name: "start",
    billboard: {
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      image: "./marker.svg",
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scale: 0.5,
    },
  });

  viewer.screenSpaceEventHandler.setInputAction((movement) => {
    viewer.dataSources.removeAll();
    viewer.scene.invertClassification = false;
    marker.show = false;

    const pickedPosition = viewer.scene.pickPosition(movement.position);

    if (!Cesium.defined(pickedPosition)) {
      return;
    }

    marker.position = pickedPosition;
    marker.show = true;
    viewer.scene.invertClassification = true;

    const cartographic = Cesium.Cartographic.fromCartesian(pickedPosition);
    getServiceArea(cartographic);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);


  const scene = viewer.scene;
  scene.invertClassification = true;
  scene.invertClassificationColor = new Cesium.Color(0.4, 0.4, 0.4, 1.0);

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-122.38329, 37.74015, 16000),
    orientation: {
      pitch: Cesium.Math.toRadians(-70.0),
    },
  });

  const cartesian = Cesium.Cartesian3.fromDegrees(-122.39429, 37.78988);
  getServiceArea(Cesium.Cartographic.fromCartesian(cartesian)).then(() => {
    marker.position = cartesian;
  });
})();
