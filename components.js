class LogicSocket extends Rete.Socket {
    constructor(name, getter) {
        super(name);
        this.getter = getter;
    }

    getOutput(node, key) {
        return this.getter(node, key);
    }
}
let numSocket = new LogicSocket('Number', (node,key) => { return (node.outputs[key] === undefined ? undefined : node.outputs[key].value) || 0; });
let boolSocket = new LogicSocket('Boolean', (node,key) => { return (node.outputs[key] === undefined ? undefined : node.outputs[key].value) || false; });
let compositeSocket = new LogicSocket('Composite', (node,key) => { return (node.outputs[key] === undefined ? undefined : node.outputs[key].value) || {}; });

class LogicComponent extends Rete.Component {
    constructor(name, options = {}) {
        super(name);
        this.inputs = options.inputs || {};
        this.outputs = options.outputs || {};
        this.controls = options.controls || [];
    }

    builder(node) {
        for (let [key,input] of Object.entries(this.inputs)) {
            node.addInput(new Rete.Input(key, input.name, input.type));
        }
        for (let val in this.controls) {
            node.addControl(this.controls[val]());
        }
        for (let [key,output] of Object.entries(this.outputs)) {
            node.addOutput(new Rete.Output(key, output.name, output.type));
        }
    }
}

class ConstNumComponent extends LogicComponent {
    constructor(){
        super("ConstantNumber", {
            controls: [
                () => new NumControl('value'),
            ],
            outputs: {
                out: {name: "Number", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.out = node.cfg.value;
    }
}

class AbsComponent extends LogicComponent {
    constructor(){
        super("Abs", {
            inputs: {
                in: {name:"x", type: numSocket},
            },
            outputs: {
                out: {name: "|x|", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.out = Math.abs(inputs.in);
    }
}

class DeltaComponent extends LogicComponent {
    constructor(){
        super("Delta", {
            inputs: {
                in: {name: "x", type: numSocket},
            },
            outputs: {
                out: {name: "dx/dt", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        if (node.data.stored) {
            outputs.out = inputs.in - (node.data.stored);
        }
        else {
            outputs.out = 0;
        }
        node.data.stored = inputs.in;
    }
}

class AddComponent extends LogicComponent {
    constructor(){
        super("Add", {
            inputs: {
                a: {id: 'a', name: "A", type: numSocket},
                b: {id: 'b', name: "B", type: numSocket},
            },
            outputs: {
                out: {name: "a + b", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.out = inputs.a + inputs.b;
    }
}

class SubComponent extends LogicComponent {
    constructor(){
        super("Subtract", {
            inputs: {
                a: {id: 'a', name: "A", type: numSocket},
                b: {id: 'b', name: "B", type: numSocket},
            },
            outputs: {
                out: {name: "a - b", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.out = inputs.a - inputs.b;
    }
}

class MultiplyComponent extends LogicComponent {
    constructor(){
        super("Multiply", {
            inputs: {
                a: {name: "A", type: numSocket},
                b: {name: "B", type: numSocket},
            },
            outputs: {
                out: {name: "a * b", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.out = inputs.a * inputs.b;
    }
}

class DivComponent extends LogicComponent {
    constructor(){
        super("Divide", {
            inputs: {
                a: {name: "A", type: numSocket},
                b: {name: "B", type: numSocket},
            },
            outputs: {
                out: {name: "a / b", type: numSocket},
                error: {name: "error", type: boolSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.error = inputs.b == 0;
        if (outputs.error)
            outputs.out = 0;
        else
            outputs.out = inputs.a / inputs.b;
    }
}

class ModuloComponent extends LogicComponent {
    constructor(){
        super("Modulo", {
            inputs: {
                a: {name: "A", type: numSocket},
                b: {name: "B", type: numSocket},
            },
            outputs: {
                out: {name: "a % b", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        if (inputs.b == 0)
            outputs.out = 0;
        else
            outputs.out = inputs.a % inputs.b;
    }
}

class NumericSwitchComponent extends LogicComponent {
    constructor(){
        super("Numeric Switch", {
            inputs: {
                on: {name: "true", type: numSocket},
                off: {name: "false", type: numSocket},
                select: {name: "select", type: boolSocket},
            },
            outputs: {
                out: {name: "output", type: numSocket},
            }
        });
    }

    worker(node, inputs, outputs) {
        outputs.out = inputs.select ? inputs.on : inputs.off;
    }
}

class NumericConsumerComponent extends LogicComponent {
    constructor(){
        super("Number Output", {
            inputs: {
                in: {name: "in", type: numSocket},
            },
            controls: [
                () => new NumPreview('value'),
            ]
        });
    }

    worker(node, inputs, outputs) {
        node.data.value = inputs.in;
    }
}

class BooleanConsumerComponent extends LogicComponent {
    constructor(){
        super("Boolean Output", {
            inputs: {
                in: {name: "in", type: boolSocket},
            },
            controls: [
                () => new NumPreview('value'),
            ]
        });
    }

    worker(node, inputs, outputs) {
        node.data.value = inputs.in;
    }
}

class NumericDelayComponent extends LogicComponent {
    constructor(){
        super("Delay Number", {
            inputs: {
                in: {name: "in", type: numSocket},
            },
            outputs: {
                out: {name: "out", type: numSocket},
            },
            controls: [
                () => new NumPreview('value'),
            ]
        });
        this.is_delay = true;
    }

    precalculate(node, outputs) {
        outputs.out = node.data.value || 0;
    }

    worker(node, inputs, outputs) {
        node.data.value = inputs.in;
    }
}

class BooleanDelayComponent extends LogicComponent {
    constructor(){
        super("Delay Boolean", {
            inputs: {
                in: {name: "in", type: boolSocket},
            },
            outputs: {
                out: {name: "out", type: boolSocket},
            },
            controls: [
                () => new NumPreview('value'),
            ]
        });
        this.is_delay = true;
    }

    precalculate(node, outputs) {
        outputs.out = node.data.value || false;
    }

    worker(node, inputs, outputs) {
        node.data.value = inputs.in;
    }
}

let constNumComponent = new ConstNumComponent();
let absComponent = new AbsComponent();
let deltaComponent = new DeltaComponent();
let addComponent = new AddComponent();
let subComponent = new SubComponent();
let multiplyComponent = new MultiplyComponent();
let divComponent = new DivComponent();
let moduloComponent = new ModuloComponent();
let numericSwitch = new NumericSwitchComponent();

let numericConsumer = new NumericConsumerComponent();
let boolConsumer = new BooleanConsumerComponent();

let numericDelay = new NumericDelayComponent();
let boolDelay = new BooleanDelayComponent();

let components = [
    constNumComponent,
    absComponent,
    deltaComponent,
    addComponent,
    subComponent,
    multiplyComponent,
    divComponent,
    moduloComponent,
    numericSwitch,
    numericConsumer,
    boolConsumer,
    numericDelay,
    boolDelay,
];
