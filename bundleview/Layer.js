/**
* The Layer class is a logical representation of a layer in the bundle views hirarchical graph.
* Most of its functionality is used for internal computations for the bundle view layout.
* However, you can use it to determain the nodes that belong to a certain layer and the layer's index using the getter functions below.
* You can get the layer of a node using it's <pre>layer()</pre> getter method. See <a href="./Node.html">Node</a> documentation.
*/
import BundleView from './BundleView.js';

BundleView.Layer = function( bundleView, parent, child ) {

  this._parent     = parent;
  this._child      = child;
  this._nodes      = [];

  bundleView._addLayer( this );
  if ( parent !== undefined ) {
    parent._child = this ;
  }
  if ( child !== undefined ) {
    child._parent = this ;
  }
};
BundleView.Layer.prototype.constructor = BundleView.Layer;
BundleView.Layer.prototype.innerRadius = function() {
  if ( this.child() === undefined ) {
    return this.bundleView().innerRadius();
  } else {
    return this.outerRadius() - this.bundleView().nodeThickness();
  }
};
BundleView.Layer.prototype.outerRadius = function() {
  if ( this.parent() === undefined ) {
    return this.bundleView().outerRadius();
  } else {
    return this.parent().innerRadius() - this.bundleView().layerPadding();
  }
};
BundleView.Layer.prototype.addNode = function( node ) {
  if ( this._nodes.indexOf( node ) === - 1 ) {
    node._layer = this;
    this._nodes.push( node );
  }
};
BundleView.Layer.prototype.removeNode = function( node ) {
  var index = this._nodes.indexOf( node );
  if ( index !== - 1 ) {
    node._layer = undefined;
    this._nodes.splice( index, 1 );
  }
};
BundleView.Layer.prototype.totalWeight = function( type ) {
  return this._cache('totalWeight', function() {
    var total = 0;
    for (var nodeNum = 0; nodeNum < this._nodes.length; nodeNum++) {
      total += this._nodes[nodeNum].weight( type );
    }
    return total;
  });
};
BundleView.Layer.prototype.maxWeight = function( type ) {
  return this._cache('maxWeight', function() {
    var max = 0, w = 0;
    for (var nodeNum = 0; nodeNum < this._nodes.length; nodeNum++) {
      w = this._nodes[nodeNum].weight( type );
      if ( w > max ) {
        max = w;
      }
    }
    return max;
  });
};
BundleView.Layer.prototype.routingRadius = function() {
  var numberOfLayers = this.bundleView()._layers.length;
  var layerIndex     = this.index();
  var innerRadius    = this.bundleView().innerRadius();
  var safeRadius    = this.bundleView().safeRadius();

  return innerRadius - (numberOfLayers - layerIndex) * (innerRadius - safeRadius) / numberOfLayers;
};

/**
* Get the next layer in the hirarchy.
*/
BundleView.Layer.prototype.child = function() { return this._child; };
/**
* Get the previous layer in the hirarchy.
*/
BundleView.Layer.prototype.parent = function() { return this._parent; };
/**
* Get the BundleView object.
*/
BundleView.Layer.prototype.bundleView = function() { return this._bundleView; };
/**
* Get an array of nodes that belong to this layer.
*/
BundleView.Layer.prototype.nodes = function() { return this._nodes; };
/**
* Get the index of this layer in the hirarchy. 0 = root layer.
*/
BundleView.Layer.prototype.index = function() { return this.bundleView()._layers.indexOf( this ); };
