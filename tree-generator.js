/**
 * The TreeGenerator generates random xml which can be taken by a Bundel View as input.
 * To generate the xml for a given Bundle View, call new TreeGenerator(bundleView);
 * If you want to generate a random BundleView call new TreeGenerator(undefined, number of desired layers, number of desired nodes, number of desired relations);
 * All parameters are optional. As a default (when no parameter is giben) a random Bundle View with 2 layers, 50 nodes and 100 relations will be generated.
 *
 * Nodes are always randomly attached to layers. The deeper the layer the more nodes will be attached to it.
 * Relations are randomly attached to leaf nodes nodes with no subnodes). Only a  few nodes will be selected to have aoutgoing relations.
 * All nodes may have incomming relations. This gives a slightly better visualization than pure random arrangment.
 *
 * You may want to use <em>createXML()</em>, <em>download()</em>, or <em>copyInto()</em> to access the generated xml.
 **/
let baseGenerators = {
  halsteadComplexity: new ValueGenerator(ValueGenerator.linearDistribution(0, 1)),
  cyclomaticComplexity: new ValueGenerator(ValueGenerator.linearDistribution(2, 5)),

  color: new OrdinalGenerator(),
  status: new OrdinalGenerator(OrdinalGenerator.examples.status),
  severity: new OrdinalGenerator(OrdinalGenerator.examples.severity),
  type: new OrdinalGenerator(OrdinalGenerator.examples.type)
};

class TreeGenerator {
  constructor(layerCount = 2, nodeCount = 50, relationCount = 100, attributeGenerators = baseGenerators) {
    this.layerCount = layerCount;
    this.nodeCount = Math.max(nodeCount, layerCount);
    this.relationCount = relationCount;
    this.attributeGenerators = attributeGenerators;
    this.nodes_per_level = this.nodesPerLevel();

    console.log(this.nodes_per_level);

    this.bundleView = this.initBundleView();
  }

  initBundleView() {
    var bundleView = new BundleView();
    // create layers
    this.layers = [];
    for (var layerNum = 0; layerNum < this.layerCount; layerNum++) {
      var layer = new BundleView.Layer( bundleView, this.layers[layerNum -1] /* parent layer */);
      this.layers[layerNum] = layer;
    }

    // create nodes
    this.createSubnodes( bundleView, undefined );

    if ( LabelGenerator !== undefined ) {
      for( var i = 0; i < bundleView._nodes.length; i++) {
        let node = bundleView._nodes[i];
        node._label = LabelGenerator.generate();
        if(node.isLeaf()) {
          Object.keys(this.attributeGenerators).forEach((attributeName) => {
            console.log(attributeName);
            let generator = this.attributeGenerators[attributeName].generate();
            node.setAttribute(attributeName, generator);
          });
        }
      }
    }

    // create relations
    var bottomNodes = [];
    for( var i = 0; i < bundleView._nodes.length; i++) {
      if ( bundleView._nodes[i].isLeaf() ) {
        bottomNodes.push( bundleView._nodes[i] );
      }
    }
    if ( bottomNodes.length == 0) { return bundleView }
    var startNodes = [];
    for( var i = 0; i < bottomNodes.length; i++) {
      if ( Math.random() < 0.15 ) {
        startNodes.push( bottomNodes[i] );
      }
    }
    if ( startNodes.length == 0) { startNodes.push(bottomNodes[0]); }
    var startNode, endNode;
    for( var i = 0; i < this.relationCount; i++) {
      startNode = startNodes[Math.floor(Math.random()*startNodes.length)];
      endNode = bottomNodes[Math.floor(Math.random()*bottomNodes.length)];
      var relation = new BundleView.Relation( bundleView, startNode, endNode );
    }

    return bundleView;
  }
  nodesPerLevel() {
    var npl = new Array(this.layerCount);
    for (var i = 0; i < this.layerCount; i++) {
      npl[i] = 1;
    }
    var j;
    for (var i = 0; i < this.nodeCount - this.layerCount; i++) {
      j = Math.ceil((1 - Math.random() * Math.random()) * this.layerCount) - 1;
      npl[j]++;
    }
    return npl;
  }
  createSubnodes( bundleView, parentNode ) {
    for (var level = 0; level < this.layers.length; level++) {
      if ( this.layers.length <= level ) {
        return;
      }
      for (var i = 0; i < this.nodes_per_level[level]; i++) {
        var node;
        if ( level > 0) {
          node = this.layers[level-1]._nodes[Math.floor(Math.random() * (this.layers[level-1]._nodes.length - 1))];
        }
        new BundleView.Node( bundleView, this.layers[level], node );
      }
    }
  }

  /**
   * Generates the desired xml and returns it as a string.
   **/
  createXml() {
    for (var i = 0; i < this.bundleView._nodes.length; i++) {
      this.bundleView._nodes[i].xmlId = i;
    }
    for (var i = 0; i < this.bundleView.relations().length; i++) {
      this.bundleView.relations()[i].xmlId = i;
    }
    var str = "<?xml version=\"1.0\"?>\n<hierarchy version=\"1.0\">\n  <nodes>\n";
    var parent;
    str += "    <node id=\"0\">\n      <parentId>-1</parentId>\n      <label>invisible root node</label>\n    </node>\n";
    for (var i = 0; i < this.bundleView._nodes.length; i++) {
      parent = this.bundleView._nodes[i].parent();
      str +="    <node id=\"" + (i + 1) + "\">\n      <parentId>" + (parent ? parent.xmlId + 1 : 0) + "</parentId>\n      <label>" + this.bundleView._nodes[i].label() + "</label>\n    </node>\n";
    }
    str += "  </nodes>\n  <relations>\n"
    for (var i = 0; i < this.bundleView.relations().length; i++) {
      str +="    <relation>\n      <sourceId>" + (this.bundleView.relations()[i].from.xmlId + 1) + "</sourceId>\n      <destId>" + (this.bundleView.relations()[i].to.xmlId + 1) + "</destId>\n    </relation>\n";
    }
    str += "  </relations>\n</hierarchy>\n";
    return str;
  }

  createJSON() {
    function createNodeDesc() {
      return {
        children: [],
        attributes: {}
      }
    }

    function convertToRelationDesc(relation) {
      return {
        source: relation.from.id,
        target: relation.to.id,
        attributes: {}
      }
    }

    let nodeId = 1;

    function appendRecursively(node, parentDesc) {
      let nodeDesc = createNodeDesc();
      nodeDesc.label = node.label();
      nodeDesc.id = node.id = nodeId++;
      Object.keys(node._attributes).forEach(attributeName => {
        nodeDesc.attributes[attributeName] = node._attributes[attributeName];
      });
      parentDesc.children.push(nodeDesc);

      node.children().forEach(child => appendRecursively(child, nodeDesc));
    }

    let rootNodeDesc = createNodeDesc();
    this.bundleView.nodes()
        .filter(node => node.parent() === undefined)
        .forEach(node => appendRecursively(node, rootNodeDesc));

    let relations = this.bundleView.relations()
        .map(convertToRelationDesc);

    return {
      nodes: rootNodeDesc,
      relations
    };
  }

  /**
   * Generates xml and tells your browser to save the file as a download.
   * If the files is too large the browser may not allow that. That highly depends on the used browser.
   **/
  download() {
    location.href = "data:application/octet-stream," + encodeURIComponent(this.createXml());
  }

  /**
   * Takes a DOM element as a parameter. The xml ill be generated and written as innerHTML into the given DOM element.
   **/
  copyInto( domElement ) {
    $(domElement).html(this);
  }
}
