let VueSocket = {
  props: ['type', 'socket'],
  template: `<div class="socket" :class="[type, socket.name] | kebab" :title="socket.name" />`
}
let VueNodeLogicComponent = {
  props: ['node', 'editor', 'bindSocket', 'bindControl', "order"],
  template: `<div class="node" :class="[selected(), node.name, color()] | kebab">
               <div class="title">[ID:{{node.id}}, {{node.order !== undefined ? node.order : '?'}}] {{node.name}}</div>
               <div class="output" v-for='output in outputs()' :key="output.key">
                 <div class="output-title">{{output.name}}<span> [{{output.value !== undefined ? output.value : '?'}}]</span></div>
                 <Socket v-socket:output="output" type="output" :socket="output.socket"/>
               </div>
               <div class="control" v-for="control in controls()" :key="control.key" v-control="control" />
               <div class="input" v-for='input in inputs()' :key="input.key">
                 <Socket v-socket:input="input" type="input" :socket="input.socket"/>
                 <div class="input-title" v-show="!input.showControl()">{{input.name}}</div>
                 <div class="input-control" v-show="input.showControl()" v-control="input.control"/>
               </div>
             </div>`,
  methods: {
    inputs() {
        return Array.from(this.node.inputs.values())
    },
    outputs() {
        return Array.from(this.node.outputs.values())
    },
    controls() {
        return Array.from(this.node.controls.values())
    },
    selected() {
        return this.editor.selected.contains(this.node) ? 'selected' : '';
    },
    color() {
        return (this.node.status) ? this.node.status : '';
    },
  },
  components: {
    Socket: VueSocket
  },
  directives: {
    socket: {
      bind(el, binding, vnode) {
        vnode.context.bindSocket(el, binding.arg, binding.value);
      },
      update(el, binding, vnode) {
        vnode.context.bindSocket(el, binding.arg, binding.value);
      }
    },
    control: {
      bind(el, binding, vnode) {
        if (!binding.value) return;

        vnode.context.bindControl(el, binding.value);
      }
    }
  },
}

let VueNumControl = {
  props: ['readonly', 'ikey', 'getData', 'putData'],
  template: '<input type="number" :readonly="readonly" :value="value" @input="change($event)" @dblclick.stop="" @pointerdown.stop="" @pointermove.stop=""/>',
  data() {
    return {
      value: 0,
    }
  },
  methods: {
    change(e){
      this.value = +e.target.value;
      this.update();
    },
    update() {
      if (this.ikey)
        this.putData(this.ikey, this.value)
    }
  },
  mounted() {
    this.value = this.getData(this.ikey);
  }
}

let VueNumPreview = {
  props: ['ikey', 'getData'],
  template: '<span>{{ value() }}</span>',
  methods: {
      value() {
          let val = this.getData(this.ikey);
          return val !== undefined ? val : "???";
      }
  },
}

class NumControl extends Rete.Control {
  constructor(key, readonly) {
    super(key);
    this.component = VueNumControl;
    this.props = { ikey: key, readonly };
  }

  setValue(val) {
    this.vueContext.value = val;
  }
}

class NumPreview extends Rete.Control {
  constructor(key) {
    super(key);
    this.component = VueNumPreview;
    this.props = { ikey: key };
  }

  setValue(val) {
    this.vueContext.value = val;
  }
}
