/**
* A BundleView Relation connects Nodes within the center of a BundleView.
* They are visualized with <a href="../../THREE.BSplineCurve3.html">B-Splines</a> along routing points,
* which are aligned along the mirrored node hirarchy.
*
* A relation takes the BundleView it belongs to and the start-node and
* end-node as parameters on initialization.
**/
import BundleView from './BundleView.js';

BundleView.Relation = function( bundleView, from, to) {

  this.from       = from;
  this.to         = to;
  this.nodes      = [from, to];
  this._bundleView = bundleView;
  this._attributes = {};
  this._visible   = undefined;
  bundleView._addRelation( this );
  from.addRelation( this );
};
BundleView.Relation.prototype.constructor = BundleView.Relation;

/**
* Calculates the routing points a relation is aligned to.
* Returns an array of nodes except with the shortest connection between the start- and end-node
* (including the start- and end-node itself)
* The least common ancestor in the node hirarchy is not included in the list if the
* removeLCA parameter was given to the BundleView.
**/
BundleView.Relation.prototype.calculatePath = function() {
  var pathA, pathB, minified;
  minified = false;
  pathA = this.from.rootPath().concat( [ undefined ] );
  pathB = this.to.rootPath().concat( [ undefined ] );
  while( !minified ) {
    minified = true;
    if( (pathA[ pathA.length - 1] === pathB[ pathB.length - 1]) && (pathA[ pathA.length - 2] === pathB[ pathB.length - 2]) && ( pathA.length > 1 ) && ( pathB.length > 1 ) ) {
      pathA.pop(); pathB.pop();
      minified = false;
    }
    else if( pathA[ pathA.length - 1] == pathB[ pathB.length - 1] ) {
      var commonNode = pathA.pop()
      if ( commonNode === undefined || (this.bundleView().removeLCA() && (pathA.length + pathB.length) > 3) ) {
        pathB.pop();
      }
    }
  }
  return pathA.concat( pathB.reverse() );
};

/**
* Takes an array of node elements and converts it to THREE.Vector3 vertices.
* Those vertices are later used as routing points.
* For the very first and last point in the array anchorPoint() is called to find the vertex,
* otherwise routingPoint() is called on the node.
**/
BundleView.Relation.prototype.mapPathToVertices = function( path ) {
  var vertices = [ path[0].anchorPoint() ];
  for(var i = 1; i < path.length - 1; i++) {
    vertices.push( path[i].routingPoint() );
  }
  vertices.push( path[path.length - 1].anchorPoint() );
  return vertices;
};

/**
* Takes a list of vertices and repositions them depending on the BundleView's bundlingStrength parameter.
* The routing points are repositioned to straighten the line.
* If bundlingStrength is 1 no change will be applied - the lower the parameter, the more the line will be
* straightened.
**/
BundleView.Relation.prototype.strengthenPoints = function( path ) {
  var b = this.bundleView().bundlingStrength()
      p0 = path[0],
      n  = path.length - 1,
      pn = path[n];

  for(var i = 1; i < path.length - 1; i++) {
    path[i].multiplyScalar(b).addSelf(p0.clone().addSelf(pn.clone().subSelf(p0).multiplyScalar(i/n)).multiplyScalar(1-b));
  }
  return path;
};

/**
* Calculates the color of the relations. Therefore the relation_color property handler is called.
**/
BundleView.Relation.prototype.color = function( index ) {
  if ( this.bundleView()._propertyHandler.relation_color.relative ) {
    var u, c_start, c_end;
    u = this.bundleView()._propertyHandler.relation_color.handler.call( this, this, index );
    colors = this.bundleView()._propertyHandler.relation_gradient_color.handler.call( this, this );
    c_start = Util.settingToColor(colors.start );
    c_end = Util.settingToColor( colors.end );
    return Util.interpolateColors( c_start, c_end, u );
  } else {
    var c = this.bundleView()._propertyHandler.relation_color.handler.call( this, this, index );
    return Util.settingToColor( c );
  }
}

/**
* Calculates the scene object for this relation.
* Therefore THREE.BSplineCurve3 is used.
**/
BundleView.Relation.prototype.curve = function() {
  return this._cache('curve', function() {
    var points, curve;
    return new THREE.BSplineCurve3( this.strengthenPoints( this.mapPathToVertices( this.calculatePath() ) ) );
  });
}
/**
* Builds the scene object for this relation. Two boolean flags are taken as parameters.
* <ul>
* <li>buildGeometry: (optional, defaults to <em>true</em>) Wether to rebuild/update the relation geometry (e.g. vertex positions).</li>
* <li>buildMaterial: (optional, defaults to <em>true</em>) Wether to rebuild/update the material (e.g. texture, lighning)</li>
* </ul>
*
* On the very first call the flags are ignored, as the have to initially build the geometry and material anyways.
**/
BundleView.Relation.prototype.buildSceneObject = function( buildGeometry, buildMaterial ) {
  if( !this.isVisible() ) {
    // Return an empty scene object if nothing should be done (object is not visible)
    this.sceneObject = new THREE.Object3D();
    return this.sceneObject;
  }

  buildGeometry = buildGeometry === undefined ? true : buildGeometry;
  buildMaterial = buildMaterial === undefined ? true : buildMaterial;

  var geometry, material;

  if (buildGeometry || (this.sceneObject && this.sceneObject.geometry === undefined)) {
    geometry = new THREE.Geometry();
    var colors   = [],
        n_sub    = 6,
        position = 0,
        index    = 0,
        spline   = this.curve();

    for ( i = 0; i <= (spline.points.length - 2) * n_sub; i ++ ) {
      index = i / ( (spline.points.length - 2) * n_sub );
      position = spline.getPointAt( index );
      geometry.vertices[ i ] = new THREE.Vertex( new THREE.Vector3( position.x, position.y, position.z ) );
      colors[ i ] = this.color( index );
    }

    geometry.colors = colors;
  } else {
    geometry = this.sceneObject.geometry;
  }

  if (buildMaterial || (this.sceneObject && this.sceneObject.material === undefined)) {
    material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 0.8, linewidth: this.bundleView()._relationWidth, depthTest: false } );
    material.vertexColors = true;
  } else {
    material = this.sceneObject.material;
  }

  this.sceneObject = new THREE.Line( geometry, material );
  this.sceneObject.behaviorObject = this;
  return this.sceneObject;
};

/**
* Wrapper aroung buildSceneObject. This can be used e.g. in function handlers.
* Two boolean flags are taken as parameters.
* <ul>
* <li>buildGeometry: (optional, defaults to <em>true</em>) Wether to rebuild/update the relation geometry (e.g. vertex positions).</li>
* <li>buildMaterial: (optional, defaults to <em>true</em>) Wether to rebuild/update the material (e.g. texture, lighning)</li>
* </ul>
*
* On the very first call the flags are ignored, as the have to initially build the geometry and material anyways.
**/
BundleView.Relation.prototype.updateSceneObject = function( updateGeometry, updateMaterial ) {
  updateGeometry = updateGeometry === undefined ? true : updateGeometry;
  updateMaterial = updateMaterial === undefined ? true : updateMaterial;

  if (this.sceneObject !== undefined) {
    var relationsParentNode = this.bundleView().threejs.relationsParentNode;
    this._empty_cache();
    relationsParentNode.remove(this.sceneObject);
    if( this.isVisible() ) {
      relationsParentNode.add(this.buildSceneObject( updateGeometry, updateMaterial ));
    }
  };
}

/**
* Getter function. Returns a boolean indicating wether the relation is visible or not.
* A relation is not visible if one of its nodes are not visible or if its own visible flag is set to false.
**/
BundleView.Relation.prototype.isVisible = function() {
  // If one of the connected nodes is invisible, hide the relation as well
  if (!this.from.isVisible() || !this.to.isVisible()) {
    return false;
  };
  if (this._visible === undefined) {
    this._visible = this.bundleView()._propertyHandler.relation_visibility.handler.call( this, this );
  };
  return this._visible;
};

/**
* Internally called function, which is called when the visibility of a relation changed. In that case the relations geometry is rebuild.
**/
BundleView.Relation.prototype._visibilityChanged = function() {
  this.updateSceneObject(true, false);
};

/**
* Hides a relation.
**/
BundleView.Relation.prototype.hide = function() {
  this._visible = false;
  this._visibilityChanged();
};

/**
* Let a relation appear again if it was previously hidden.
**/
BundleView.Relation.prototype.show = function() {
  this._visible = true;
  this._visibilityChanged();
};

/**
* Toggles the visibility of this relation.
**/
BundleView.Relation.prototype.toggle = function( show ) {
  this._visible = !this._visible;
  this._visibilityChanged();
};

/**
* Returns this relations Bundle View.
**/
BundleView.Relation.prototype.bundleView = function() { return this._bundleView; };

/**
* Returns an attribute attached to this relation. This function may be used to get attributes defined in the xml-file.
* Takes the key of the attribute as a parameter.
**/
BundleView.Relation.prototype.attribute = function( name ) {
  return this._attributes[name];
}
