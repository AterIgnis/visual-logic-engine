function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (1 < currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

class LogicExecutor {
    constructor(editor, components) {
        this.editor = editor;
        this.components = {};
        components.map(c => {
            this.components[c.name] = c;
        });
        this.logicNodes = [];
    }

    fixOrder() {
        let fixer = new OrderFixer(this.logicNodes, this.components);
        fixer.process();
        this.logicNodes = fixer.getList();
    }

    async init(logicMap) {
        this.logicNodes = [];

        this.editor.nodes.map(n => {
            n.order = undefined;
            n.status = undefined;
            n.update();
        });

        let nodes = [];
        for (let [k, node] of Object.entries(logicMap.nodes)) {
            nodes[nodes.length] = node;
        };
        
        nodes = shuffle(nodes); // allows checking if order of nodes matters

        for (let i = 0; i < nodes.length; ++i) {
            let node = nodes[i];
            let inputs = [];
            let outputs = [];
            for (let [key,output] of Object.entries(node.outputs)) {
                outputs[outputs.length] = {socket: key};
            }
            this.logicNodes[i] = {
                original: node,
                type: node.name,
                inputs: inputs,
                outputs: outputs,
                cfg: node.data,
                data: {},
                position: node.position || [0,0],
            };
        }
        for (let i = 0; i < nodes.length; ++i) {
            let node = nodes[i];
            let logicNode = this.logicNodes[i];
            for (let [key,input] of Object.entries(node.inputs)) {
                if (input.connections.length > 0) {
                    let conn = input.connections[0];
                    var idx_node = nodes.findIndex(n => n.id == conn.node);
                    var idx_socket = this.logicNodes[idx_node].outputs.findIndex(o => o.socket == conn.output);
                    logicNode.inputs[logicNode.inputs.length] = {
                        socket: key,
                        target_node: idx_node,
                        target_socket: idx_socket,
                    };
                }
            }
        }

        this.fixOrder();

        for (var i in this.logicNodes) {
            var node = this.logicNodes[i];
            let nodeType = this.components[node.type];
            for (let i = 0; i < node.inputs; ++i) {
                node.inputs[i].type = nodeType.inputs[node.inputs[i].signal].type;
            }

            if (node.original) {
                node.original.order = i;

                var en = this.editor.nodes.find(n => n.id == node.original.id);
                if (en) {
                    en.inputs.forEach((input, key) => {
                        if (input.connections.length == 0) return;
                        let lInput = node.inputs.find(i => i.socket == key);
//                        input.loops = lInput.loops;
                        let target = this.logicNodes[lInput.target_node];
                        let conn = input.connections[0];
                        conn.data.split = !target.original;
                    });

                    en.order = i;
//                    en.loops = node.loops;
                    en.status = 'prepared';
                    en.update();
                    this.editor.view.updateConnections({node: en});
                }
            }
        }
    }

    getNodeById(id) {
        return this.logicNodes.find(n => n.id == id);
    }

    async tick() {
        for (let [nodeKey, node] of Object.entries(this.logicNodes)) {
            var nodeType = this.components[node.type];
            if (nodeType.precalculate) {
                var outputs = {};
                nodeType.precalculate(node, outputs);
                node.status = 'calculated';
                for (let output of node.outputs) {
                    output.value = outputs[output.socket];
                }
            } else {
                node.status = 'prepared';
            }
        }

        try {
            for (let nodeIdx in this.logicNodes) {
                let node = this.logicNodes[nodeIdx];
                var nodeType = this.components[node.type];

                var error = false;
                var inputs = {};
                var outputs = {};
                for (let input of node.inputs) {
                    let inputMeta = nodeType.inputs[input.socket];
                    var otherNode = this.logicNodes[input.target_node];

                    if (!otherNode || (!inputMeta.type.virtual && otherNode.status !== "calculated")) {
                        error = true;
                        node.status = 'error';
                        console.log('Node ' + nodeIdx + ':' + input.socket + ' missing node ' + input.target_node + ':' + otherNode.outputs[input.target_socket].socket);
                        break;
                    }

                    inputs[input.socket] = nodeType.inputs[input.socket].type.getOutput(otherNode, input.target_socket);
                }

                if (error) {
                    break;
                }
                else {
                    outputs = {}

                    await nodeType.worker(node, inputs, outputs);

                    for (let output of node.outputs) {
                        if (outputs[output.socket] !== undefined) {
                            output.value = outputs[output.socket];
                        }
                    }
                    if (node.cfg !== undefined) {
                        for (let k in node.data) {
                            node.cfg[k] = node.data[k];
                        }
                    }
                    
                    node.status = 'calculated';
                }
            }
        } catch (e) { throw e; }

        this.editor.nodes.map(node => {
            var lNode = this.logicNodes.find(n => n.original && n.original.id == node.id);
            if (lNode) {
                for (let [key,output] of node.outputs) {
                    let lOutput = lNode.outputs.find(o => o.socket == key)
                    if (lOutput) {
                        output.value = lOutput.value;
                    }
                    else {
                        output.value = '?';
                    }
                }
                for (let control of node.controls.values()) {
                    control.update();
                }
                node.status = lNode.status;
            }
            else {
                node.status = "";
            }
            node.update();
        });
    }

    toJSON() {
        let nodes = {};
        for (let nodeIdx = 0; nodeIdx < this.logicNodes.length; ++nodeIdx) {
            let node = this.logicNodes[nodeIdx];
            let position = node.original ? node.original.position : node.position;
            let inputs = {};
            let outputs = {};
            nodes[nodeIdx] = {
                id: nodeIdx,
                name: node.type,
                data: node.cfg || {},
                inputs,
                outputs,
                position,
            };
        }
        for (let nodeIdx = 0; nodeIdx < this.logicNodes.length; ++nodeIdx) {
            let node = this.logicNodes[nodeIdx];
            for (let input of node.inputs) {
                let inputs = nodes[nodeIdx].inputs;
                let otherNode = this.logicNodes[input.target_node];
                let out_socket = otherNode.outputs[input.target_socket].socket;
                inputs[input.socket] = {
                    connections: [
                        {
                            node: input.target_node,
                            input: out_socket,
                            data: {},
                        }
                    ]
                };

                let outputs = nodes[input.target_node].outputs;
                if (outputs[out_socket] === undefined) {
                    outputs[out_socket] = {};
                }
                let output = outputs[out_socket];
                if (output.connections === undefined) {
                    output.connections = [];
                }
                output.connections[output.connections.length] = {
                    node: nodeIdx,
                    input: input.socket,
                    data: {},
                };
            }
        }
        return {
            id: 'logic@0.0.0',
            nodes
        };
    }

    reset() {
        this.logicNodes = [];
    }
}
