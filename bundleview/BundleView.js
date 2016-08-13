/**
* This is the main class for the BundleView visualisation.<br />
* BundleViews visualize a tree structure in a ring and relations between the tree nodes as lines within the ring.<br />
* <img src="../screenshots/bundle_view_9_milestone3_presentation.png" alt="An image of a BundleView" width="90%" /><br />
*
* A BundleView consists of the following classes:
* <ul>
* <li><a href="./BundleView/Layer.html">Layer</a></li>
* <li><a href="./BundleView/Node.html">Node</a></li>
* <li><a href="./BundleView/Relation.html">Relation</a></li>
* </ul>
**/
var BundleView = function( container, options ) {

  options = options || {}
  // A BundleView may be given several options on initialization:

  // <em>outerRadius:</em> outer radius of the bundle view
  this._outerRadius       = options.outerRadius         || 150;
  // <em>innerRadius:</em> inner radius of the bundle view's ring (< outerRadius)
  this._innerRadius       = options.innerRadius         || 110;
  // <em>safeRadius:</em> radius in the inner view where no relation is routed through (< innerRadius)
  this._safeRadius        = options.safeRadius          || 20;
  // <em>maxNodeHeight:</em> defines the maximum height of a node, when having a relative node height handler
  this._maxNodeHeight     = options.maxNodeHeight       || 20;
  // <em>layerPadding:</em> distance between two layers
  this._layerPadding      = options.layerPadding        || 2;
  // <em>nodePadding:</em> distance between nodes within a layer (as an angle)
  this._nodePadding       = options.nodePadding         || 0.01;
  // <em>relationWidth:</em> width of the relation lines
  this._relationWidth     = options.relationWidth       || 3;
  // <em>bundlingStrength:</em> (0..1) We move each routing point a little for each relation. The smaller the value, the more we move.
  this._bundlingStrength  = options.bundlingStrength    || 0.85;
  // <em>removeLCA:</em> removes the least common ancestor from the relations routing points
  this._removeLCA         = (options.removeLCA === undefined) ? true : !!options.removeLCA;
  // <em>animationCount:</em> changed through start/stop-Animation() functions. Animate bundleView if greater than 0
  this._animationCount    = 0;
  // <em>drawRoutingPoints:</em> wether to draw the inner points of a bundle view, where the relations are routed through
  this._drawRoutingPoints = (options.drawRoutingPoints === undefined) ? false : !!options.drawRoutingPoints;
  // <em>routingPointsColor:</em> the color of the routing points
  this._routingPointColor = (options.routingPointColor === undefined) ? 0xFFFFFF : options.routingPointColor;
  // <em>routingPointsColor:</em> the color of the routing points
  this._routingPointRadius = (options.routingPointRadius === undefined) ? 1 : options.routingPointRadius;
  // <em>drawWireframe:</em> wether to draw nodes as wireframes and not a solid structures
  this._drawWireframes    = (options.drawWireframe === undefined) ? false : !!options.drawWireframe;
  // <em>showShadows:</em> wether to use sophisticated lighting or not
  this._showShadows       = (options.showShadows === undefined) ? true : !!options.showShadows;
  // <em>showLables:</em> defines which labels to show (true = all, false = none, 50 = for all nodes that are bigger than 50, [0, 1] = only for layer 0 and 1).
  this._showLabels        = (options.showLabels === undefined) ? 50 : options.showLables;

  // <em>mouseOptions:</em> allows to set all mouse-related options. Refere to <a href="./Vis3D/Mouse.html">Mouse</a>.
  var mouseOptions = options.mouseOptions || {
    clickEnabled: true,
    tooltipEnabled: true
  };

  this._layers       = [];
  this._nodes        = [];
  this._relations    = [];
  // list of callback functions to call for each frame within the animation loop
  // can be modified by startAnimation() and stopAnimation()
  this._updateListeners   = options.updateListeners     || [];

  var _this = this;
  /**
    <b>Property handler</b> are specific functions that calculate the appereance of a node or relation.
    A handler may return relative values ('relative: true'), or directly return
    the desired values ('relative: false') - e.g. a node color.
    Relative node handlers shall return a number being the weight of that node in comparison to the other sibling nodes.
    When calculating the relative relation color a number 0 <= x <= 1 shall be returned that defines which part
    of the relation gradiment to use.

    The current node/relation is alwas given as the first argument. For the relation_color handler
    a number u ( 0 <= u <= 1) is given, that gives you the current percentage of the relation-part,
    that is going to be drawn.

    Property handler may be changed through special function of a BundleView, for example:
    <ul>
      <li>setPropertyHandler (most generic handler setter)</li>
      <li>setNodeLengthHandler</li>
      <li>setNodeColorHandler</li>
      <li>( more documentation on those functions can be found in the following sections )</li>
    </ul>
  */
  this._propertyHandler = {
    node_length: {
      relative: true,
      handler: function( node ) {
		console.log("mode_length");
		return 1;
	  }
    },
    node_height: {
      relative: true,
      handler: function( node ) { return 0;}
    },
    node_color: {
      relative: false,
      handler: function( node ) {
        if ( node.tooSmall() )
          return node.bundleView()._nodeColors.small;
        if ( node.isLeaf() )
           return node.bundleView()._nodeColors.leaf;
        return node.bundleView()._nodeColors.basic;
      }
    },
    node_textColor: {
      relative: false,
      handler: function( node ) {
        return node.bundleView()._nodeTextColor;
      }
    },
    node_gradient_color: {
      handler: function ( relation ) { return _this._nodeGradientColors; }
    },
    node_gradient_textColor: {
      handler: function ( relation ) { return _this._nodeGradientColors; }
    },
    node_visibility: {
      handler: function( node ) {
        return true;
      }
    },
    node_tooltip_text: {
      handler: function( node ) {
        return $("<b>").text(node.label()).html();
      }
    },
    relation_color: {
      relative: true,
      handler: function( relation, u ) { return u; }
    },
    relation_gradient_color: {
      handler: function ( relation ) { return _this._relationGradientColors; }
    },
    relation_visibility: {
      handler: function( relation ) {
        return true;
      }
    }
  };
  // <em>_nodeColors</em> defines node color for the default color propertyHandler. Those colors are used in the default node color property handler
  this._nodeColors = {
    basic: { r: 0x99, g: 0x99, b: 0x99 },
    leaf:  { r: 0x66, g: 0x66, b: 0xaf },
    small: { r: 0xca, g: 0x44, b: 0x44 }
  };
  this._nodeTextColor = { r: 0x0, g: 0x0, b: 0x0 };
  // When using a relative color propertyHandler this gradient is used to calculate the actual color of a node
  this._nodeGradientColors = {
    start: { r: 0x00, g: 0x00, b: 0x00 },
    end:   { r: 0xff, g: 0xff, b: 0xff }
  };
  // When using a relative color propertyHandler this gradient is used to calculate the actual color of a relation. This is used in the default relation color handler
  this._relationGradientColors = {
    start: { r: 0x33, g: 0xdd, b: 0x33 },
    end:   { r: 0xdd, g: 0x66, b: 0x44 }
  };
  this._particleColor = { r: 0xff, g: 0xff, b: 0xff };
};

BundleView.prototype.constructor = BundleView;

//=================================================================================
// Import XML
//=================================================================================

/**
* <em>importXml</em> takes an xml-file and builds a BundleView out of it.<br />
* Params:<ul>
*   <li><em>xmlData:</em> The content of the xml-file.</li>
* </ul>
* The file can be fetched via ajax through the importXmlFromFile() function.
**/
BundleView.prototype.importXml = function( xmlData ) {
  var $xmlData = $(xmlData);
  var rawNodes = $xmlData.find("nodes");
  var rawRelations = $xmlData.find("relations");
  var nodes = {};
  var outerLayer = new BundleView.Layer(this);

  var createNode = function( bundleView ) {
    var id = this.getAttribute("id");
    if (typeof nodes[id] !== "undefined") return;

    var $rawNode = $(this);
    var label = $rawNode.find("label").text();
    var parentId = $rawNode.find("parentId").text();
    var attributes = {};
    $rawNode.find("attributes>attribute").each(function() {
      var $attribute = $(this);
      attributes[$attribute.attr("key")] = $attribute.text();
    });

    var node = new BundleView.Node(bundleView);
    node._label = label;
    node._attributes = attributes;
    if (parentId == "0" || parentId == "-1") { // outer (root) node
      node._parent = undefined;
      outerLayer.addNode(node);
    } else {
      if (typeof nodes[parentId] === "undefined") {
        var rawParent = rawNodes.find("node#" + parentId);
        createNode(rawParent);
      }
      nodes[parentId].addChild(node);

      // if there is no layer for this hierarchy level, create one
      if (typeof nodes[parentId]._layer._child === "undefined") {
        var newLayer = new BundleView.Layer(bundleView, nodes[parentId]._layer);
        newLayer.addNode(node);
      } else {
        nodes[parentId]._layer._child.addNode(node);
      }
    }

    nodes[id] = node;
  };

  var bv = this; // set the context of the createNode call to the current element processed by each()
  rawNodes.find("node[id!=0]"/*ignore root node*/).each(function() { createNode.call(this, bv); });

  var createRelation = function ( bundleView ) {
    var $rawRelation = $(this);
    var sourceId = $rawRelation.find("sourceId").text();
    var destId = $rawRelation.find("destId").text();
    if (nodes[sourceId] === undefined || nodes[destId] === undefined) {
      console.log("The source or destination node of the relation was not defined.");
    };

    var attributes = {};
    $rawRelation.find("attributes>attribute").each(function() {
      var $attribute = $(this);
      attributes[$attribute.attr("key")] = $attribute.text();
    });
    var relation = new BundleView.Relation( bundleView, nodes[sourceId], nodes[destId] );
    relation._attributes = attributes;
  }

  rawRelations.find("relation").each(function() { createRelation.call(this, bv) });

  this.buildScene();
};
/**
* <em>importXmlFromFile</em> takes an xml-file url, fetches it, and builds a BundleView out of it.<br />
* Params:<ul>
*   <li><em>path:</em> The URL of the xml-file.</li>
*   <li><em>callback:</em> (optional) a function to be executed when the ajax call and BundleView-building is done.</li>
* </ul>
**/
BundleView.prototype.importXmlFromFile = function( path, callback ) {
  $.ajax({
    url: path,
    context: this,
    success: this.importXml,
    complete: callback,
    error: function( jqXHR, textStatus, errorThrown ) {
      console.log("Error loading XML file: " + textStatus.toUpperCase() + (errorThrown == undefined ? "" : " - " + errorThrown));
    }
  });
};

//=================================================================================
// Import JSON
//=================================================================================

BundleView.prototype.importJSON = function( jsonData ) {
	var jsonNodes = jsonData.nodes;
	var jsonRelations = jsonData.relations;

	var nodes = {};
	var outerLayer = new BundleView.Layer(this);

	var createNode = function(jsonNode, nodeId, bundleView) {
		var label = jsonNode.label;
		var link = jsonNode.link;
		var parentId = jsonNode.parentId;

		if (typeof nodes[nodeId] !== "undefined") return;
		
		var node = new BundleView.Node(bundleView);
		node._label = label;
		node._link = link;
		if(nodeId !== "undefined")
			if(typeof window.importJson !== "undefined")
				if(typeof window.importJson.hostId !== "undefined")
					if(window.importJson.hostId === nodeId)
						node.__isHost = true;

		if (parentId == "0" || parentId == "-1" || parentId == "root") { // outer (root) node
			node._parent = undefined;
			outerLayer.addNode(node);
		} else {
			if (typeof nodes[parentId] === "undefined") {
				var rawParent = jsonNodes[parentId];
				createNode(rawParent, parentId, bundleView);
			}
			nodes[parentId].addChild(node);

			// if there is no layer for this hierarchy level, create one
			if (typeof nodes[parentId]._layer._child === "undefined") {
				var newLayer = new BundleView.Layer(bundleView, nodes[parentId]._layer);
				newLayer.addNode(node);
			} else {
				nodes[parentId]._layer._child.addNode(node);
			}
		}

		nodes[nodeId] = node;
	}

	var bv = this; // set the context of the createNode call to the current element processed by each()
	$.each(jsonNodes, function(nodeId, jsonNode) {
		if(nodeId == "0" || nodeId == "-1" || nodeId == "root")
			return;
		createNode(jsonNode, nodeId, bv);
	});
	
	// create visuals for given relations
	var createRelation = function (jsonRelation, bundleView) {
		var sourceId = jsonRelation.sourceId;
		var destId = jsonRelation.destId;
		var incoming = jsonRelation.incoming || false;
		var outgoing = jsonRelation.outgoing || false;
		
		if (nodes[sourceId] === undefined || nodes[destId] === undefined) {
			console.log("The source or destination node of the relation was not defined.");
		};

		var relation = new BundleView.Relation( bundleView, nodes[sourceId], nodes[destId] );
		relation.incoming = incoming;
		relation.outgoing = outgoing;
	}

	$.each(jsonRelations, function(index, relation) {
		//console.log(index, relation);
		createRelation(relation, bv);
	});
	
	this.buildScene();
	return this;
};

//============================
//============================
//============================
// TODO: adlust call here
//============================
//============================
//============================
BundleView.prototype.importJSONFromFile = function( path, callback ) {
  $.ajax({
    url: path,
    context: this,
    success: this.importJSON,
    complete: callback,
    error: function( jqXHR, textStatus, errorThrown ) {
      console.log("Error loading XML file: " + textStatus.toUpperCase() + (errorThrown == undefined ? "" : " - " + errorThrown));
    }
  });
};

//=================================================================================

BundleView.prototype._addLayer = function( layer ) {
  if ( this._layers.indexOf( layer ) === - 1 ) {
    layer._bundleView = this;
    this._layers.push( layer );
  }
};
BundleView.prototype._removeLayer = function( layer ) {
  var index = this._layers.indexOf( layer );
  if ( index !== - 1 ) {
    layer._bundleView = undefined;
    this._layers.splice( index, 1 );
  }
};
BundleView.prototype._addNode = function( node ) {
  if ( this._nodes.indexOf( node ) === - 1 ) {
    node._bundleView = this;
    this._nodes.push( node );
  }
};
BundleView.prototype._removeNode = function( node ) {
  var index = this._nodes.indexOf( node );
  if ( index !== - 1 ) {
    node._bundleView = undefined;
    this._nodes.splice( index, 1 );
  }
};
BundleView.prototype._addRelation = function( relation ) {
  if ( this._relations.indexOf( relation ) === - 1 ) {
    relation._bundleView = this;
    this._relations.push( relation );
  }
};
BundleView.prototype._removeRelation = function( relation ) {
  var index = this._relations.indexOf( relation );
  if ( index !== - 1 ) {
    relation._bundleView = undefined;
    this._relations.splice( index, 1 );
  }
};
BundleView.prototype.nodeThickness = function() {
  return this._cache("nodeThickness", function() {
    var maxDepth = 0;
    for (var i = 0; i < this.nodes().length; i++) {
      if(!this.nodes()[i].isVisible()) continue;
      if (this.nodes()[i].layer().index() > maxDepth) {
        maxDepth = this.nodes()[i].layer().index();
        if (maxDepth == this.layers().lenght) { break; };
      };
    };

    var paddings = maxDepth * this.layerPadding();
    return ( this.outerRadius() - this.innerRadius() -  paddings) / (maxDepth + 1);
  });
};
BundleView.prototype.loadTestScenario = function( params ) {
  params = params || {};
  var maxLayers = params['maxLayers'] || 3;
  var maxSubnodes = params['maxSubnodes'] || 10;
  var maxRelationsPerNode = params['maxRelationsPerNode'] || 20;

  // create layers
  var layers = [];
  var numLayers = Math.floor( Math.random() * (maxLayers - 1) ) + 2;
  for (var layerNum = 0; layerNum < numLayers; layerNum++) {
    var layer = new BundleView.Layer( this, layers[layerNum -1] );
    layers[layerNum] = layer;
  }

  // create nodes
  var createSubnodes = function( createSubnodes, bundleView, node, maxSubnodes, layers, level ) {
    if ( layers.length <= level ) {
      return this;
    }
    var numSubnodes = Math.floor( Math.random() * (maxSubnodes - 1) ) + 2;
    for (var subnodeNum = 0; subnodeNum < numSubnodes; subnodeNum++) {
      var subnode = new BundleView.Node( bundleView, layers[level], node );
      createSubnodes( createSubnodes, bundleView, subnode, maxSubnodes, layers, level + 1 );
    }
  }
  var numSubnodes = Math.floor( Math.random() * (maxSubnodes - 1) ) + 2;
  for (var nodeNum = 0; nodeNum < numSubnodes; nodeNum++) {
    var node = new BundleView.Node( this, layers[0] );
    createSubnodes( createSubnodes, this, node, maxSubnodes, layers, 1 );
  }

  if ( LabelGenerator !== undefined ) {
    for( var i = 0; i < this.nodes().length; i++) {
      this.nodes()[i]._label = LabelGenerator.generate();
    }
  }

  // create relations
  var bottomNodes = layers[layers.length - 1].nodes();
  if ( bottomNodes.length <= 1) { return this; }
  for (var nodeNum = 0; nodeNum < bottomNodes.length; nodeNum++) {
    if (Math.random() < 0.2) {
      var node = bottomNodes[nodeNum];
      var numRelations = Math.floor( Math.random() * maxRelationsPerNode ) + 1;
      for (var relationNum = 0; relationNum < numRelations; relationNum++) {
        var otherNode = node;
        while( otherNode === node ) {
          otherNode = bottomNodes[Math.floor(Math.random()*bottomNodes.length)];
        }
        var relation = new BundleView.Relation( this, node, otherNode );
      }
    }
  }
  this.buildScene();
  return this;
};
BundleView.prototype._animationLoop = function() {
  var _this = this;
  if (this._animationCount > 0) {
    for(var i = 0; i < this._updateListeners.length; i++) {
      this._updateListeners[i].call( this );
    }
    this.render();
    requestAnimFrame(function(){_this._animationLoop.call(_this)});
  };
};
BundleView.prototype.startAnimation = function( updateListener ) {
  if ( updateListener !== undefined && this._updateListeners.indexOf( updateListener ) === - 1 ) {
    this._updateListeners.push( updateListener );
    this._animationCount++;
    if (this._animationCount == 1) {
      this._animationLoop();
    };
  }
};
BundleView.prototype.stopAnimation = function( updateListener ) {
  if ( updateListener !== undefined ) {
    var index = this._updateListeners.indexOf( updateListener );
    if ( index !== - 1 ) {
      this._updateListeners.splice( index, 1 );
      this._animationCount--;
    }
  };
};

BundleView.prototype.render = function() {
  this.threejs.renderer.render( this.threejs.scene, this.threejs.camera );
};

BundleView.prototype.initWebGL = function() {
	var hasWebGL = (function () {
		try {
			return !! window.WebGLRenderingContext && !! document.createElement( 'canvas' ).getContext( 'experimental-webgl' );
		} catch(e) {
			return false;
		}
	})();
	
	if(hasWebGL) {
		this.threejs.renderer  = new THREE.WebGLRenderer( {antialias: true} );
	} else {
		this.threejs.renderer  = new THREE.CanvasRenderer( {antialias: true} );
	}
  
  //TODO: Zooming in ortho mode does not effect the camera
  this.threejs.camera = new THREE.CombinedCamera(
    this.threejs.scene_data.width,
    this.threejs.scene_data.height,
    this.threejs.camera_data.view_angle,
    this.threejs.camera_data.near,
    this.threejs.camera_data.far,
    this.threejs.camera_data.orthoNear,
    this.threejs.camera_data.orthoFar
  )

  this.threejs.renderer.setSize(this.threejs.scene_data.width, this.threejs.scene_data.height);
  this.threejs.container.append(this.threejs.renderer.domElement);
};
BundleView.prototype.initControls = function() {
  var _this = this;
  var changeCallback = function() {_this.render.call(_this)};
  var controls  = new TrackballControls(this.threejs.camera, this.threejs.renderer.domElement, changeCallback);
  controls.rotateSpeed = this.threejs.controls_data.rotateSpeed;
  controls.zoomSpeed = this.threejs.controls_data.zoomSpeed;
  controls.panSpeed = this.threejs.controls_data.panSpeed;
  controls.noZoom = this.threejs.controls_data.noZoom;
  controls.noPan = this.threejs.controls_data.noPan;
  controls.staticMoving = this.threejs.controls_data.staticMoving;
  controls.dynamicDampingFactor = this.threejs.controls_data.dynamicDampingFactor;
  controls.minDistance = this.threejs.controls_data.minDistance;
  controls.maxDistance = this.threejs.controls_data.maxDistance;
  controls.keys = this.threejs.controls_data.keys;
  this.threejs.controls = controls;
}
BundleView.prototype.buildScene = function() {
  var scene = this.threejs.scene;

  // Camera
  this.threejs.camera.position.z = 380;
  this.threejs.camera.lookAt( scene.position );
  scene.add( this.threejs.camera );

  // Light
  var light_data = this.threejs.light_data;
  if (this._showShadows) {
    this.threejs.light = new THREE.PointLight( light_data.color, light_data.intensity, light_data.height * 4 );
  } else {
    this.threejs.light = new THREE.AmbientLight( light_data.color, light_data.intensity );
  }
  this.threejs.light.position.x = 0;
  this.threejs.light.position.y = 0;
  this.threejs.light.position.z = light_data.height;
  scene.add(this.threejs.light);

  // Nodes
  scene.add(this.threejs.nodesParentNode);
  var nodes = this._nodes;
  for(var i = 0; i < nodes.length; i++) {
    this.threejs.nodesParentNode.add(nodes[i].buildSceneObject());
  }

  // Relations
  scene.add(this.threejs.relationsParentNode);
  var relation = this._relations;
  for(var i = 0; i < relation.length; i++) {
    this.threejs.relationsParentNode.add(relation[i].buildSceneObject());
  }
};
BundleView.prototype.updateScene = function( updateGeometry, updateMaterial ) {
  updateGeometry = updateGeometry === undefined ? true : updateGeometry;
  updateMaterial = updateMaterial === undefined ? true : updateMaterial;

  this.updateNodes( updateGeometry, updateMaterial );
  this.updateRelations( updateGeometry, updateMaterial );
}
BundleView.prototype.updateNodes = function( updateGeometry, updateMaterial, onlyLeaf, onlySmall ) {
  updateGeometry = updateGeometry === undefined ? true : updateGeometry;
  updateMaterial = updateMaterial === undefined ? true : updateMaterial;
  onlyLeaf = onlyLeaf || false;
  onlySmall = onlySmall || false;

  for (var i = 0; i < this._nodes.length; i++) {
    if (onlyLeaf && !this._nodes[i].isLeaf()) continue;
    if (onlySmall && !this._nodes[i].tooSmall()) continue;
    this._nodes[i].updateSceneObject( updateGeometry, updateMaterial );
  }
}
BundleView.prototype.updateRelations = function( updateGeometry, updateMaterial ) {
  updateGeometry = updateGeometry === undefined ? true : updateGeometry;
  updateMaterial = updateMaterial === undefined ? true : updateMaterial;

  for (var i = 0; i < this._relations.length; i++) {
    this._relations[i].updateSceneObject( updateGeometry, updateMaterial );
  }
}


/**
  Sets one or more property handlers.
  params: handlerOptions
    e.g.: { node_length: { relative: true, handler: function(node){return 1;} } }
*/
BundleView.prototype.setPropertyHandler = function( handlerOptions ) {
  for (var i in handlerOptions ) {
    this._propertyHandler[i] = handlerOptions[i]
  };
};

/**
  Sets the node length handler function.
  Params:
    handlerFunc: a function taking a node object. Should return a number.
    relative (optional): a boolean indication wether the function calculates a number relative to the node siblings
*/
BundleView.prototype.setNodeLengthHandler = function( handlerFunc, relative ) {
  this.setPropertyHandler({ node_length: { handler: handlerFunc, relative: !!relative}});
};

/**
  Sets the node height handler function.
  Params:
    handlerFunc: a function taking a node object. Should return a number.
    relative (optional): a boolean indication wether the function calculates a number relative to the node siblings
*/
BundleView.prototype.setNodeHeightHandler = function( handlerFunc, relative ) {
  this.setPropertyHandler({ node_height: { handler: handlerFunc, relative: !!relative}});
};

/**
  Sets the node color handler function.
  Params:
    handlerFunc: a function taking a node object. Should return a THREE.Color or a {r: 255, g: 255, b: 255}-Object.
                 (return a number if relative: true)
    relative (optional): a boolean indication wether the function calculates a number relative to the node siblings.
*/
BundleView.prototype.setNodeColorHandler = function( handlerFunc, relative ) {
  this.setPropertyHandler({ node_color: { handler: handlerFunc, relative: !!relative}});
};

/**
  Sets the node text color handler function.
  Params:
    handlerFunc: a function taking a node object. Should return a THREE.Color or a {r: 255, g: 255, b: 255}-Object.
                 (return a number if relative: true)
    relative (optional): a boolean indication wether the function calculates a number relative to the node siblings.
*/
BundleView.prototype.setNodeTextColorHandler = function( handlerFunc ) {
  this.setPropertyHandler({ node_textColor: { handler: handlerFunc }});
};

/**
  Sets the node gradient color handler function. It is used to determain the start and end color for relative node color interpolation.
  Params:
    handlerFunc: a function taking a node object that returns an object with a 'start' and an 'end' field containing
    a color ({r: ..., g:..., b:...}).
*/
BundleView.prototype.setNodeGradientColorHandler = function( handlerFunc ) {
  this.setPropertyHandler({ node_gradient_color: { handler: handlerFunc }});
};

/**
  Sets the node gradient text color handler function. It is used to determain the start and end color for relative node text color interpolation.
  Params:
    handlerFunc: a function taking a node object that returns an object with a 'start' and an 'end' field containing
    a color ({r: ..., g:..., b:...}).
*/
BundleView.prototype.setNodeGradientTextColorHandler = function( handlerFunc ) {
  this.setPropertyHandler({ node_gradient_textColor: { handler: handlerFunc }});
};

/**
  Resets the visiblity cache for each node. This becomes necessary when there is a need to re-evaluate the visibility
  handler for each node (for example if global state the handler referes to changes).
*/
BundleView.prototype.resetNodeVisibilityCache = function() {
  for (var i = 0; i < this._nodes.length; i++) {
    this._nodes[i]._visible = undefined;
  };
  this._empty_cache();
};

/**
  Sets the node visibility handler function.
  Params:
    handlerFunc: a function taking a node object. Should return true (nodes is visible) or false (invisible).
*/
BundleView.prototype.setNodeVisibilityHandler = function( handlerFunc ) {
  this.resetNodeVisibilityCache();
  this.setPropertyHandler({ node_visibility: { handler: handlerFunc}});
};

/**
  Sets the node tooltip text handler. This is called whenever a tooltip for a node should be generated.
  Params:
    handlerFunc: a function taking a node object and returning a tooltip text to be inserted into the DOM tree.
                 The text will therefore be interpreted as HTML.
*/
BundleView.prototype.setNodeTooltipTextHandler = function( handlerFunc ) {
  this.setPropertyHandler({ node_tooltip_text: { handler: handlerFunc}});
};

/**
  Sets the relation color handler function.
  Params:
    handlerFunc: a function taking a relation object and the percentage u of the line currently drawn ( 0 <= u <= 1 ).
                 Should return a THREE.Color or a {r: 255, g: 255, b: 255}-Object or a number if relative: true.
    relative (optional): a boolean indication wether the function calculates a number relative to the node siblings.
*/
BundleView.prototype.setRelationColorHandler = function( handlerFunc, relative ) {
  this.setPropertyHandler({ relation_color: { handler: handlerFunc, relative: !!relative}});
};

/**
  Sets the relation gradient color handler function. It is used to determain the start and end color for a relation.
  Params:
    handlerFunc: a function taking a relation object that returns an object with a 'start' and an 'end' field containing
    a color ({r: ..., g:..., b:...}).
*/
BundleView.prototype.setRelationGradientColorHandler = function( handlerFunc ) {
  this.setPropertyHandler({ relation_gradient_color: { handler: handlerFunc}});
};

/**
  Resets the visiblity cache for each relation. This becomes necessary when there is a need to re-evaluate the visibility
  handler for each relation (for example if global state the handler referes to changes).
*/
BundleView.prototype.resetRelationVisibilityCache = function() {
  for (var i = 0; i < this._relations.length; i++) {
    this._relations[i]._visible = undefined;
  };
};

/**
  Sets the relation visibility handler function.
  Params:
    handlerFunc: a function taking a ralation object. Should return true (nodes is visible) or false (invisible).
*/
BundleView.prototype.setRelationVisibilityHandler = function( handlerFunc ) {
  this.resetRelationVisibilityCache();
  this.setPropertyHandler({ relation_visibility: { handler: handlerFunc}});
};

BundleView.prototype.outerRadius = function() { return this._outerRadius; };
BundleView.prototype.innerRadius = function() { return this._innerRadius; };
BundleView.prototype.safeRadius = function() { return this._safeRadius; };
BundleView.prototype.layers = function() { return this._layers; };
BundleView.prototype.nodes = function() { return this._nodes; };
BundleView.prototype.relations = function() { return this._relations; };
BundleView.prototype.layerPadding = function() { return this._layerPadding; };
BundleView.prototype.nodePadding = function() { return this._nodePadding; };
BundleView.prototype.bundlingStrength = function() { return this._bundlingStrength; };
BundleView.prototype.removeLCA = function() { return this._removeLCA; };

export default BundleView;
