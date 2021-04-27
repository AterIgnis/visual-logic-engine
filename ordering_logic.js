class OrderFixer {
    constructor(logicNodes, components) {
        this.nodes = [];
        this.order = [];
        this.buffers = [];
        for (let i = 0; i < logicNodes.length; ++i) {
            let node = logicNodes[i];

            let nodeType = components[node.type];

            let inputs = [];
            for (let j = 0; j < node.inputs.length; ++j) {
                let input = node.inputs[j];
                inputs[inputs.length] = {
                    from_socket: input.socket,
                    target_node: input.target_node,
                    target_socket: input.target_socket,
//                    loops: [],
                };
            }

            let outputs = [];
            for (let j = 0; j < node.outputs.length; ++j) {
                let output = node.outputs[j];
                outputs[outputs.length] = {
                    buffer: -1,
                    type: nodeType.outputs[output.socket].type.name,
                };
            }

            this.nodes[i] = {
                node: node,
                reorder: i,
                checking: false,
                checked: false,
//                loops: [],
                in_loop: false,
                inputs: inputs,
                outputs: outputs,
                is_delay: nodeType.is_delay || false,
            };
            this.order[i] = i;
        }
    }

    process() {
        this.order = [];
        this.ordered = 0;

        let stack = [];
        let base_node = 0;
        let stack_size = 0;
        let loops = 0;
        let go_up = false;
        while (true) {
            if (go_up) {
                go_up = false;
                stack_size--;
                stack.splice(stack_size);
                if (stack_size > 0) {
                    stack[stack_size - 1].input++;
                }
            }

            if (stack_size == 0) {
                if (base_node >= this.nodes.length) {
                    break;
                }
                stack[0] = {
                    node: base_node++,
                    input: 0,
                };
                stack_size = 1;
            }

            let stack_item = stack[stack_size - 1];
            let node = this.nodes[stack_item.node];
            if (node.is_delay && stack_size > 1) {
                go_up = true;
                
                continue;
            }

            if (stack_item.input == 0) {
                if (node.checking || node.checked) {
                    if (node.checking) {
                        let loop_id = loops++;
                        for (let i = stack_size; i > 0;) {
                            --i;
                            let other_stack_item = stack[i];
                            if (i != stack_size - 1 && other_stack_item.node == stack_item.node) break;
                            
                            let other_node = this.nodes[other_stack_item.node];
//                            other_node.loops[other_node.loops.length] = loop_id;
                            other_node.in_loop = true;

                            let input = other_node.inputs[other_stack_item.input];
                            let output = other_node.outputs[input.target_socket];

                            if (output.buffer == -1) {
                                output.buffer = this.buffers.length;
                                this.buffers[output.buffer] = {
                                    node: other_stack_item.node,
                                    socket: input.target_socket,
                                };
                            }
                            
//                            input.loops[input.loops.length] = loop_id;
                        }
                    }
                    
                    go_up = true;

                    continue;
                }
                else {
                    node.checking = true;
                }
            }

            if (stack_item.input < node.inputs.length) {
                let input = node.inputs[stack_item.input];
                stack[stack_size++] = {
                    node: input.target_node,
                    input: input.target_socket,
                };
            }
            else {
                node.checking = false;
                node.checked = true;

                node.reorder = this.ordered;
                this.order[this.ordered] = stack_item.node;
                this.ordered++;

                go_up = true;
            }
        }
    }

    getList() {
        console.log('===');
        let list = [];
        let ordered = this.nodes.length;
        for (let i = 0; i < this.ordered; ++i) {
            let node = this.nodes[this.order[i]];
            for (let j = 0; j < node.inputs.length; ++j) {
                let input = node.inputs[j];
                let targetNode = this.nodes[input.target_node];
                let targetSocket = targetNode.outputs[input.target_socket];
//                node.node.inputs[j].loops = input.loops;
                if (targetSocket.buffer !== -1 && node.in_loop) {
                    node.node.inputs[j].target_node = this.ordered + targetSocket.buffer;
                    node.node.inputs[j].target_socket = 0;
                }
                else {
                    node.node.inputs[j].target_node = this.nodes[node.inputs[j].target_node].reorder;
                }
            }
//            node.node.loops = [...node.loops];
            list[i] = node.node;
            console.log('> ' + i + ": " + list[i].original.id + " - " + list[i].type);
        }
        for (let i = 0; i < this.buffers.length; ++i) {
            let out_id = this.ordered + i;
            let buffer = this.buffers[i];
            let owner = this.nodes[buffer.node];
            let owner_pos = owner.node.position || [0,0];
            let inputs = [{
                socket: 'in',
                target_node: owner.reorder,
                target_socket: buffer.socket,
            }];
            list[out_id] = {
                type: 'Delay ' + owner.outputs[buffer.socket].type,
                inputs: inputs,
                outputs: [{socket: 'out'}],
                data: {},
                position: [owner_pos[0] + 100, owner_pos[1]],
            };
            console.log('> ' + out_id + ": " + list[out_id].type);
        }
        return list;
    }
}
