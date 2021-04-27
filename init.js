(async () => {
    let container = document.querySelector('#rete');

    let render = VueRenderPlugin.default;
    let renderOpts = {
        component: VueNodeLogicComponent
    };

    let editor = new Rete.NodeEditor('logic@0.0.0', container);
    editor.use(ConnectionPlugin.default);
    editor.use(render, renderOpts);
    editor.use(AreaPlugin, {
        background: true,
        snap: 1,
        scaleExtent: { min: 0.1, max: 1 },
        translateExtent: { width: 5000, height: 4000 }
    });
    editor.use(HistoryPlugin.default);
    editor.use(DockPlugin.default, {
        container: document.querySelector('.dock'),
        plugins: [[render, renderOpts]],
        itemClass: 'item'
    });
    editor.use(KeyboardPlugin);

    components.map(c => {
        editor.register(c);
    });

    editor.on("updateconnection", ({el, connection, points}) => {
        const path = el.querySelector('.connection path');
        if (path) {
            if (connection.data.split)
                path.classList.add("split");
            else
                path.classList.remove("split");
        }
    });

    let i11 = await constNumComponent.createNode({value: -1});
    let i12 = await absComponent.createNode();
    let i21 = await constNumComponent.createNode({value: 2});
    let i31 = await constNumComponent.createNode({value: 10});
    let l11 = await multiplyComponent.createNode();
    let l12 = await addComponent.createNode();
    let c11 = await deltaComponent.createNode();
    let c12 = await moduloComponent.createNode();
    let l21 = await addComponent.createNode();
    let o1 = await subComponent.createNode();
    let o2 = await absComponent.createNode();
    let sl1 = await absComponent.createNode();
    let sl2 = await absComponent.createNode();

    let startX = 0;
    let startY = 0;
    let stepX = 300;
    let stepY = 200;
    i11.position = [startX + stepX * 0, startX + stepY * 0];
    i12.position = [startX + stepX * 1, startX + stepY * 0];
    i21.position = [startX + stepX * 1, startX + stepY * 2];
    i31.position = [startX + stepX * 2, startX + stepY * 3];
    l11.position = [startX + stepX * 2, startX + stepY * 0];
    l12.position = [startX + stepX * 2, startX + stepY * 2];
    c11.position = [startX + stepX * 3, startX + stepY * 0];
    c12.position = [startX + stepX * 3, startX + stepY * 2];
    l21.position = [startX + stepX * 4, startX + stepY * 0];
    o1.position  = [startX + stepX * 5, startX + stepY * 1];
    o2.position  = [startX + stepX * 6, startX + stepY * 1];
    sl1.position = [startX + stepX * 5, startX + stepY * 2];
    sl2.position = [startX + stepX * 5, startX + stepY * 3];

    editor.addNode(i11);
    editor.addNode(i12);
    editor.addNode(i21);
    editor.addNode(i31);
    editor.addNode(l11);
    editor.addNode(l12);
    editor.addNode(c11);
    editor.addNode(c12);
    editor.addNode(l21);
    editor.addNode(o1);
    editor.addNode(o2);
    editor.addNode(sl1);
    editor.addNode(sl2);

    editor.connect(i11.outputs.get('out'), i12.inputs.get('in'));
    editor.connect(i12.outputs.get('out'), l11.inputs.get('a'));
    editor.connect(l12.outputs.get('out'), l11.inputs.get('b'));
    editor.connect(l11.outputs.get('out'), l12.inputs.get('a'));
    editor.connect(i21.outputs.get('out'), l12.inputs.get('b'));
    editor.connect(l11.outputs.get('out'), c11.inputs.get('in'));
    editor.connect(l12.outputs.get('out'), c12.inputs.get('a'));
    editor.connect(i31.outputs.get('out'), c12.inputs.get('b'));
    editor.connect(c11.outputs.get('out'), l21.inputs.get('a'));
    editor.connect(l21.outputs.get('out'), l21.inputs.get('b'));
    editor.connect(l21.outputs.get('out'), o1.inputs.get('a'));
    editor.connect(c12.outputs.get('out'), o1.inputs.get('b'));
    editor.connect(o1.outputs.get('out'), o2.inputs.get('in'));
    editor.connect(sl1.outputs.get('out'), sl2.inputs.get('in'));
    editor.connect(sl2.outputs.get('out'), sl1.inputs.get('in'));

    editor.view.resize();
    AreaPlugin.zoomAt(editor);

    let engine = new LogicExecutor(editor, components);

    let btnPrepare = document.querySelector("#prepare");
    btnPrepare.onclick = async () => {
        await engine.init(editor.toJSON());
    };

    let btnCalculate = document.querySelector("#calculate");
    btnCalculate.onclick = async () => {
        await engine.tick(editor);
    };

    let btnExport = document.querySelector("#export");
    btnExport.onclick = async () => {
        await editor.fromJSON(engine.toJSON());
        await engine.init(editor.toJSON());
    };

    let btnSave = document.querySelector("#save");
    btnSave.onclick = async () => {
        localStorage.setItem("logic", JSON.stringify(editor.toJSON()));
    };
    let btnLoad = document.querySelector("#load");
    btnLoad.onclick = async () => {
        let data = localStorage.getItem("logic");
        if (data) {
            data = JSON.parse(data);
        }
        if (data) {
            await editor.fromJSON(data);
            AreaPlugin.zoomAt(editor);
            await engine.reset();
        }
    };
})();
