module csComp.Services {
    'use strict';

    declare var L;
    
    export class TileLayerSource implements ILayerSource
    {


      title = "tilelayer";
      //service : LayerService;
      requiresLayer = false;
      constructor(public service: LayerService) {

      }

      public addLayer(layer : ProjectLayer, callback : Function) {
          layer.layerRenderer = "tilelayer";
          //this.$rootScope.$apply();
      }

      removeLayer(layer : ProjectLayer)
      {

      }

    }

  }
