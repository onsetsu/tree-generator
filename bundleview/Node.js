/**
* This class represents a node with all its behavior.
* A Node can be given an arbitrary number of arbitrary attributes (key-value-objects) for storing metrics and the like.
* These attributes can be used to determain the nodes behavior or look using the <a href="../BundleView.html">BundleView's</a> handler functions.
* In the scene it is represented with a <a href="../../THREE.ArcGeometry.html">THREE.ArcGeometry</a>.
* Initialization params:
*   bundleView: The BundleView object the node belongs to.
*   layer: The Layer object the node belongs to.
*   parent: An optional parent node. If this is a root node, the parent should be undefined.
*   label: The 'name' of the node that labeled on it or and displayed in the tooltip.
**/
BundleView.Node = function( bundleView, layer, parent, label) {

  this._label        = label;
  this._layer        = layer;
  this._parent       = parent;
  this._children     = [];
  this._inRelations  = [];
  this._outRelations = [];
  this._attributes   = {};
  this._visible      = undefined;

  bundleView._addNode( this );
  if (typeof layer !== "undefined") {
    layer.addNode( this );
  };
  if ( typeof parent !== "undefined" ) {
    parent.addChild( this );
  }
};
BundleView.Node.prototype.constructor = BundleView.Node;

/**
* Get the label of the node.
**/
BundleView.Node.prototype.label = function() {
  return this._label;
};
/**
* Add a child node to this node.
* Params:
*   child: The child Node object that should be added.
**/
BundleView.Node.prototype.addChild = function( child ) {
  if ( this._children.indexOf( child ) === - 1 ) {
    if ( child._parent !== undefined ) {
      child._parent.removeChild( child );
    }
    this._children.push( child );
    child._parent = this;
  }
};
/**
* Remove the given child node from this node.
* Params:
*   child: The child Node object that should be removed.
**/
BundleView.Node.prototype.removeChild = function( child ) {
  var index = this._children.indexOf( child );
  if ( index !== - 1 ) {
    child._parent = undefined;
    this._children.splice( index, 1 );
  }
};
/**
* Define a new outgoing relation of this node.
* Params:
*   relation: A Relation object that should be added.
**/
BundleView.Node.prototype.addRelation = function( relation ) {
  if ( this._outRelations.indexOf( relation ) === - 1 ) {
    this._outRelations.push( relation );
  }
  if ( relation.to._inRelations.indexOf( relation ) === - 1 ) {
    relation.to._inRelations.push( relation );
  }
};
/**
* Remove an outgoing relation from this node.
* Params:
*   relation: A Relation object that should be removed.
**/
BundleView.Node.prototype.removeRelation = function( relation ) {
  var index = this._outRelations.indexOf( relation );
  if ( index !== - 1 ) {
    this._outRelations.splice( index, 1 );
  }
  index = relation.to._inRelations.indexOf( relation );
  if ( index !== - 1 ) {
    relation.to._inRelations.splice( index, 1 );
  }
};
/// returns the Vector of the inner point where relations are routed through
BundleView.Node.prototype.routingPoint = function() {
  var angle = (this.startAngle() + this.endAngle()) / 2;
  var radius = this.layer().routingRadius();
  return new THREE.Vector3( Math.cos(angle) * radius, Math.sin(angle) * radius, -0.01 );
};
// returns the Vector of the point where may relations connect to this node
BundleView.Node.prototype.anchorPoint = function() {
  var angle = (this.startAngle() + this.endAngle()) / 2;
  var radius = this.innerRadius();
  return new THREE.Vector3( Math.cos(angle) * radius, Math.sin(angle) * radius, -0.01 );
};
BundleView.Node.prototype.innerRadius = function() {
  return this.isLeaf() ? this.bundleView().innerRadius() : this.layer().innerRadius();
};
BundleView.Node.prototype.outerRadius = function() {
  return this.layer().outerRadius();
};
/**
* Returns the color of the node. It is determained using the BundleView's node color handler.
**/
BundleView.Node.prototype.color = function() {
  if ( this.bundleView()._propertyHandler.node_color.relative ) {
    var t, c1, c2;
    t = this.relativeMaxWeight( 'node_color' );
    colors = this.bundleView()._propertyHandler.node_gradient_color.handler.call( this, this );
    c1 = Util.settingToColor( colors.start );
    c2 = Util.settingToColor( colors.end );
    return Util.interpolateColors( c1, c2, t );
  } else {
    var c = this.bundleView()._propertyHandler.node_color.handler.call( this, this );
    return Util.settingToColor( c );
  }
};
/**
* Returns the color of the node's label text. It is determained using the BundleView's node text color handler.
**/
BundleView.Node.prototype.textColor = function() {
  if ( this.bundleView()._propertyHandler.node_textColor.relative ) {
    var t, c1, c2;
    t = this.relativeMaxWeight( 'node_textColor' );
    colors = this.bundleView()._propertyHandler.node_gradient_textColor.handler.call( this, this );
    c1 = Util.settingToColor( colors.start );
    c2 = Util.settingToColor( colors.end );
    return Util.interpolateColors( c1, c2, t );
  } else {
    var c = this.bundleView()._propertyHandler.node_textColor.handler.call( this, this );
    return Util.settingToColor( c );
  }
};
/**
* Returns the height of the node. It is determained using the BundleView's node height handler.
**/
BundleView.Node.prototype.height = function() {
  if ( this.bundleView()._propertyHandler.node_height.relative ) {
    return this.bundleView()._maxNodeHeight * this.relativeMaxWeight( 'node_height' );
  } else {
    return this.bundleView()._propertyHandler.node_height.handler.call( this, this );
  }
};
BundleView.Node.prototype.weight = function( type ) {
  if ( !this.isVisible() ) {
    return 0;
  };
  if ( !this.bundleView()._propertyHandler[type].relative ) {
    console.log("BundleView.Node.weight-Error - type '", type, "' is not registered as a relative Attribute Type.");
  }
  return this.bundleView()._propertyHandler[type].handler.call( this, this );
};
BundleView.Node.prototype.totalWeight = function( type ) {
  return this._cache('totalWeight', function() {
    var total = 0;
    if ( !this.isVisible() ) {
      return 0;
    };
    for (var nodeNum = 0; nodeNum < this._children.length; nodeNum++) {
      total += this._children[nodeNum].weight( type );
    }
    return total;
  });
};
BundleView.Node.prototype.maxWeight = function( type ) {
  return this._cache('maxWeight', function() {
    var max = 0, w = 0;
    for (var nodeNum = 0; nodeNum < this._children.length; nodeNum++) {
      w = this._children[nodeNum].weight( type );
      if ( w > max ) {
        max = w;
      }
    }
    return max;
  });
};
BundleView.Node.prototype.relativeTotalWeight = function( type ) {
  if( this.parent() === undefined ) {
    return this.weight( type ) / this.layer().totalWeight( type );
  }
  else {
    return this.weight( type ) / this.parent().totalWeight( type ) * this.parent().relativeTotalWeight( type );
  }
};
BundleView.Node.prototype.relativeMaxWeight = function( type ) {
  if( this.parent() === undefined ) {
    return this.weight( type ) / this.layer().maxWeight( type );
  }
  else {
    return this.weight( type ) / this.parent().maxWeight( type );
  }
};
BundleView.Node.prototype.startAngle = function() {
  return this._cache('startAngle', function() {
    if( this.isRoot() ) {
      var index = this.siblings().indexOf( this );
      if( index === 0 ) {
        return 0;
      } else {
        return this.siblings()[index - 1].endAngle();
      }
    }
    else {
      var index = this.parent().children().indexOf( this );
      if( index === 0 ) {
        return this.parent().startAngle();
      } else {
        return this.parent().children()[index - 1].endAngle();
      }
    }
  });
};
BundleView.Node.prototype.endAngle = function() {
  return this._cache('endAngle', function() {
    return this.startAngle() + 2 * Math.PI * this.relativeTotalWeight('node_length');
  });
};
/**
* Returns the text of the node's tooltip. It is determained using the BundleView's tooltip text handler.
**/
BundleView.Node.prototype.tooltipText = function() {
  return this.bundleView()._propertyHandler.node_tooltip_text.handler.call( this, this );
};
/**
* Returns the value of an attribute with the given name.
* Parames:
*   name: The name of the attribute.
**/
BundleView.Node.prototype.attribute = function( name ) {
  return this._attributes[name];
}
BundleView.Node.prototype.setAttribute = function( name, value ) {
  return this._attributes[name] = value;
}
BundleView.Node.prototype.tooSmall = function() {
  var nodePadding, startAngle, endAngle;
  nodePadding = this.bundleView().nodePadding() / 2;
  startAngle  = this.startAngle() + nodePadding;
  endAngle    = this.endAngle() - nodePadding;
  if( endAngle - startAngle < 0.001 ) {
    return true;
  }
  return false;
};
BundleView.Node.prototype.buildSceneObject = function( buildGeometry, buildMaterial ) {
  if (!this.isVisible()) {
    // Only a dummy object
    this.sceneObject = new THREE.Object3D();
    return this.sceneObject;
  };

  buildGeometry = buildGeometry === undefined ? true : buildGeometry;
  buildMaterial = buildMaterial === undefined ? true : buildMaterial;

  var geometry, nodePadding, mesh, startAngle, endAngle, topMaterial, sideMaterial, texture;
  var steppingAngle = 2 * Math.PI / 50;

  nodePadding = this.bundleView().nodePadding() / 2;
  startAngle = this.startAngle() + nodePadding;
  endAngle   = this.endAngle() - nodePadding;
  if( endAngle - startAngle < 0.001 ) {
    startAngle = this.startAngle();
    endAngle   = Math.max( this.endAngle(), startAngle + 0.0001);
  }

  if (buildMaterial || (this.sceneObject && this.sceneObject.materials === undefined)) {
    var arcWidth = (endAngle - startAngle) * (this.innerRadius() + this.outerRadius()) / 2;
    var arcHeight = this.outerRadius() - this.innerRadius();

    var showLabels = this.bundleView()._showLabels;
    var showLabelForThisNode =
      showLabels === true ||
      ($.isArray(showLabels) && $.inArray(this.layer().index(), showLabels) != -1) ||
      ($.isNumeric(showLabels) && arcWidth > showLabels);

    if (this.bundleView()._showShadows) {
      if (showLabelForThisNode) {
        texture = new THREE.TextTexture(this._label, {'backgroundColor': this.color(), 'width': arcWidth, 'height': arcHeight, 'color': this.textColor()});
        topMaterial  = new THREE.MeshPhongMaterial( { map: texture, wireframe: this.bundleView()._drawWireframes } );
      } else {
        topMaterial = new THREE.MeshPhongMaterial( { wireframe: this.bundleView()._drawWireframes } );
        topMaterial.color = this.color();
      }
      sideMaterial = new THREE.MeshPhongMaterial( { wireframe: this.bundleView()._drawWireframes } );
    } else {
      if (showLabelForThisNode) {
        texture = new THREE.TextTexture(this._label, {'backgroundColor': this.color(), 'width': arcWidth, 'height': arcHeight, 'color': this.textColor()});
        topMaterial  = new THREE.MeshBasicMaterial( { map: texture, wireframe: this.bundleView()._drawWireframes } );
      } else {
        topMaterial = new THREE.MeshBasicMaterial( { wireframe: this.bundleView()._drawWireframes } );
        topMaterial.color = this.color();
      }
      sideMaterial = new THREE.MeshBasicMaterial( { wireframe: this.bundleView()._drawWireframes } );
    }
    sideMaterial.color = this.color();
  } else {
    topMaterial  = this.sceneObject.materials[0];
    sideMaterial = this.sceneObject.materials[1];
    console.log(this.sceneObject.materials);
  }

  if (buildGeometry || (self.sceneObject && self.sceneObject.geometry === undefined)) {
    geometry = new THREE.ArcGeometry( startAngle, endAngle, this.innerRadius(), this.outerRadius(), this.height() || 0, steppingAngle, [topMaterial, sideMaterial] );
  } else {
    geometry = this.sceneObject.geometry;
    geometry.materials = [topMaterial, sideMaterial];
  }

  mesh = new THREE.Mesh( geometry, new THREE.MeshFaceMaterial() );


  if ( this.bundleView()._drawRoutingPoints ) {
    var routingMesh = new THREE.Mesh( new THREE.SphereGeometry( this.bundleView()._routingPointRadius ), new THREE.MeshBasicMaterial({ color: this.bundleView()._routingPointColor }) );
    routingMesh.position = this.routingPoint();
    mesh.add( routingMesh );
  }

  this.sceneObject = mesh;
  // Backward reference to the behaviour node (this object)
  this.sceneObject.behaviorObject = this;

  return this.sceneObject;
};
/**
* Call this method if you changed the node's appearance in any way.
* You can also select to update the geometry or the material, depending on what changes you did.
* Updating only the parts of the node that need to be updated improves the performance.
* Params:
*   updateGeometry: If true, the geometry of the node will be rebuild.
*   updateMaterial: if true, the material of the node will be rebuild.
**/
BundleView.Node.prototype.updateSceneObject = function( updateGeometry, updateMaterial ) {
  updateGeometry = updateGeometry === undefined ? true : updateGeometry;
  updateMaterial = updateMaterial === undefined ? true : updateMaterial;

  if (this.sceneObject !== undefined) {
    var nodesParentNode = this.bundleView().threejs.nodesParentNode;
    this._empty_cache();
    this.layer()._empty_cache();
    nodesParentNode.remove(this.sceneObject);
    if ( this.isVisible() ) {
      nodesParentNode.add(this.buildSceneObject( updateGeometry, updateMaterial ));
    }
  };
};
/**
* Determains whether this is a root node.
**/
BundleView.Node.prototype.isRoot = function() {
  return this.parent() === undefined;
};
/**
* Determains whether this is a leaf node.
**/
BundleView.Node.prototype.isLeaf = function() {
  if( this.children().length == 0 ) {
    return true;
  } else {
    for (var i = 0; i < this.children().length; i++) {
      if( this.children()[i].isVisible() ) return false;
    };
    return true;
  };
};
BundleView.Node.prototype.rootPath = function() {
  var path = [ this ], node = this;
  while( !node.isRoot() ) {
    node = node.parent();
    path.push( node );
  }
  return path;
};
/**
* Toggle the visibility of the outgoing relations of this node.
* Params:
*   show: If specified, set the visibility of the relations to the given value (<pre>true</pre> or <pre>false</pre>).
**/
BundleView.Node.prototype.toggleRelations = function( show ) {
  if( this.__showRelations === undefined) {
    this.__showRelations = true;
  }
  if( show !== undefined ) {
    this.__showRelations = show;
  } else {
    this.__showRelations = !this.__showRelations;
  }
  for( var i = 0; i < this._children.length; i++) {
    this._children[i].toggleRelations( this.__showRelations );
  }
  for( var i = 0; i < this._outRelations.length; i++) {
    this._outRelations[i].toggle( this.__showRelations );
  }
};
/**
* Returns all nodes on the same layer as this one.
**/
BundleView.Node.prototype.siblings = function() {
  return this.layer().nodes();
};
/**
* Returns the visibility of this node.
* It is determained using the BundleView's node visibility handler and by the visibility of the parent node.
**/
BundleView.Node.prototype.isVisible = function() {
  // If we changed the visiblity, return that changed state
  // Note: parent invisibility overrides
  if (this._visible !== undefined) {
    if(this._visible === false) return false;
    else if(this.isRoot()) return this._visible;
    else if(!this.parent().isVisible()) return false;
    else return this._visible; // can only be true
  // if the parent is invisible, this node is invisible too
  } else if(!this.isRoot() && !this.parent().isVisible()) {
    return false;
  // else ask the handler
  } else {
    // Remember the result
    this._visible = this.bundleView()._propertyHandler.node_visibility.handler.call( this, this );
    return this._visible;
  }
};
BundleView.Node.prototype._visibilityChanged = function() {
  for( var i = 0; i < this.siblings().length; i++ ) {
    this.siblings()[i].updateSceneObject(true, false);
  }
  for( var i = 0; i < this.children().length; i++ ) {
    this.isVisible() ? this.children()[i].show() : this.children()[i].hide();
  }
  this.bundleView().updateRelations(true, false);
};
/**
* Hide this node. Also hides the connected relations.
**/
BundleView.Node.prototype.hide = function() {
  this._visible = false;
  this._visibilityChanged();
  this.bundleView().updateNodes();
};
/**
* Show this node and all its relations.
**/
BundleView.Node.prototype.show = function() {
  this._visible = true;
  this._visibilityChanged();
};
/**
* Returns a list of all relation of this node and its subnodes.
**/
BundleView.Node.prototype.findAllRelations = function() {
  var relations = [];
  relations = relations.concat(this.relations());
  for(var i = 0; i < this.children().length; i++) {
    relations = relations.concat( this.children()[i].findAllRelations() );
  }
  return relations;
};
/**
* TODO: This feature is only experimental. It may be removed or re-implemented using the new animation functionality.
**/
BundleView.Node.prototype.startRelationHighlights = function() {
  var geometry, relations, material, particles, updateFunc, stopFunc, startTime, stopTime, bundleView;
  relations = this.findAllRelations();
  geometry = new THREE.Geometry();
  for ( var i = 0; i < relations.length; i ++ ) {
    var vector = relations[i].curve().getPointAt( 0 );
    geometry.vertices.push( new THREE.Vertex( vector ) );
  }
  material = new THREE.ParticleBasicMaterial( { size: 5 } );
  material.color = Util.settingToColor( this.bundleView()._particleColor );
  particles = new THREE.ParticleSystem( geometry, material );
  this.bundleView().threejs.scene.add( particles );
  startTime = Date.now();
  stopTime = startTime + 1000 * 7 // 7 seconds
  bundleView = this.bundleView();
  bundleView.startAnimation();
  updateFunc = function() {
    var t = (Date.now() - startTime) / (stopTime - startTime);
    if ( t < 1) {
      for ( var i = 0; i < relations.length; i ++ ) {
        var v = relations[i].curve().getPointAt( t );
        geometry.vertices[i].position.set( v.x, v.y, v.z );
        // flag to the particle system that we've
        // changed its vertices. This is the
        // dirty little secret.
        particles.geometry.__dirtyVertices = true;
      }
      requestAnimFrame( updateFunc );
    } else {
      bundleView.threejs.scene.removeObject( particles );
      setTimeout(function(){bundleView.stopAnimation();}, 50);
    }
  };
  requestAnimFrame( updateFunc );
};
BundleView.Node.prototype.startEmittingParticles = function() {
  var _this = this, callback;
  if( this.emitParticles ) {
    return;
  }
  this.emitParticles = true;
  for(var i = 0; i < this.children().length; i++) {
    this.children()[i].emitParticles = true;
  }
  callback = function() {
    _this.startRelationHighlights();
    if( _this.emitParticles ) {
      window.setTimeout(callback, 1000 );
    }
  }
  window.setTimeout(callback, 1000 );
};
BundleView.Node.prototype.stopEmittingParticles = function() {
  this.emitParticles = false;
  for(var i = 0; i < this.children().length; i++) {
    this.children()[i].stopEmittingParticles();
  }
};
BundleView.Node.prototype.descendants = function() {
  var descendants = [];
  for(var i = 0; i < this.children().length; i++) {
    descendants.push(this.children()[i]);
    descendants = descendants.concat(this.children()[i].descendants());
  }
  return descendants;
};

/**
* Get the BundleView object this node belongs to.
**/
BundleView.Node.prototype.bundleView = function() { return this._bundleView; };
/**
* Get the Layer object this node belongs to.
**/
BundleView.Node.prototype.layer = function() { return this._layer; };
/**
* Get the parent node if any.
**/
BundleView.Node.prototype.parent = function() { return this._parent; };
/**
* Get the child node if any.
**/
BundleView.Node.prototype.children = function() { return this._children; };
/**
* Get an array of outgoing relations of this node.
**/
BundleView.Node.prototype.relations = function() { return this._outRelations; };
/**
* Get an array of incoming relations of this node.
**/
BundleView.Node.prototype.incomingRelations = function() { return this._inRelations; };
