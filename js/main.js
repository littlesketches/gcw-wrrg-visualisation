///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///                                                 ///
/// A CUSTOM WASTE AND RESOURCE RECOVERY FLOWS      ///
/// VISUALISATION FOR GRAMPIANS CENTRAL WEST WRGG   ///
///                                                 ///
/// ----------------------------------------------  ///
/// VERSION 0.8                                     ///
/// Made by Little Sketches in October 2021         ///
///                                                 ///
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

    ///////////////////////////////////////////////
    // 1. INSTANTIATE SETTINGS AND DATA OBJECTS ///
    ///////////////////////////////////////////////

    const settings = { 
        svgID:                  'flow-vis',
        dataSource:             'gsheet',      // 'local' or 'gsheet'
        info: {
            wrrgFullName:       'Grampians Central West Waste and Resource Recovery Group'
        },
        layout: {
            orientation:        'landscape',    //  'portrait' or 'landscape'
            showTitle:          true,
        },
        dimsByOrientation: {
            portrait:{
                width:              1200,
                height:             1800,
                margin: {
                    top:            30,
                    bottom:         150,
                    left:           120,
                    right:          80
                }
            },
            landscape: {
                width:              1800,
                height:             1000,
                margin: {
                    top:            20,
                    bottom:         150,
                    left:           10,
                    right:          150
                }
            }
        },
        geometry: {            
            nodePos:            {},
            nodeSize:           {min: 20, max: 60},
            linkWidth:          {min: 5, max: 30},
            flowGap:            2
        },           
    }

    const data = {
        inputTable:     {},
        chart:          {
            node:       {},
            link:       {},
        },
        schema: {
            list:       {},
        }

    }

    const vis = {
        el:     {},
        state:  {           // Initialisation state
            region:         'all LGAs in GCW',
            material:       'all materials',
            year:           2019
        },
        scale:  {},
        linkGenerators: {
            straightLink: d3.line()
                .x(d => d.x)
                .y(d => d.y),
            linkVertical: d3.linkVertical()         // Bezier link generator accepting object {source: [x,y], and   target [x,y] }
                .source(d => d.source)
                .target(d => d.target),  
            linkHorizontal: d3.linkHorizontal()    // Bezier link generator accepting object {source: [x,y], and   target [x,y] }
                .source(d => d.source)
                .target(d => d.target),  
            linkVerticalOffset:  (obj) => {
                const totalLinkHeight = Math.abs(obj.target[1] - obj.source[1]),
                    stem1_height = totalLinkHeight * obj.stemLength1,
                    stem2_height = totalLinkHeight * (1 - obj.stemLength2)

                const vertStem1 = `M${obj.source[0]} ${obj.source[1]} v${stem1_height}`,
                    vertStem2 = `v${stem2_height}`,
                    curvePath = vis.linkGenerators.linkVertical({
                        source: [obj.source[0],  obj.source[1] + stem1_height],
                        target: [obj.target[0],  obj.target[1] - stem2_height]
                    })
                const path = `${vertStem1} ${curvePath} ${vertStem2}`
                return path
            },   
            linkHorizontalOffset:  (obj) => {
                const totalLinkWidth = Math.abs(obj.target[1] - obj.source[1]),
                    stem1_width = totalLinkWidth * obj.stemLength1,
                    stem2_width = totalLinkWidth * (1 - obj.stemLength2)
                const horiStem1 = `M${obj.source[1]} ${obj.source[0]} h${stem1_width}`,
                    horiStem2 = `h${stem2_width}`,
                    curvePath = vis.linkGenerators.linkHorizontal({
                        source: [obj.source[1] + stem1_width,  obj.source[0] ],
                        target: [obj.target[1] - stem2_width,  obj.target[0] ]
                    })
                const path = `${horiStem1} ${curvePath} ${horiStem2}`
                return path
            }   
        },
        methods: {
            ui:     {
                updateVis(){
                    // 1. Update the vis state
                    vis.state.region = document.querySelector('#region-selector').value
                    vis.state.year = document.querySelector('#year-selector').value
                    vis.state.material = document.querySelector('#material-selector').value

                    // 2. Animate out and remove current vis and re-render
                    const svg = d3.select(`#${settings.svgID}`)
                    svg.transition().duration(250)
                        .style('opacity', 0)
                    setTimeout(() => {
                        svg.selectAll('*').remove()
                        renderVis()
                        svg.transition().duration(750)
                            .style('opacity', null)
                    }, 250);
                },
                closeModal(){
                    document.querySelector('.modal-container').classList.add('closed')
                    document.querySelector('main').classList.remove('blur')
                }, 
                openModal(){
                    document.querySelector('.modal-container').classList.remove('closed')
                    document.querySelector('main').classList.add('blur')
                } 
            }
        }
    }


    /////////////////////////////////
    // 2. CALL  VIS BUILD SEQUENCE //
    /////////////////////////////////

    buildVis(settings)

    // Load data from TSV files from GSheet
    function buildVis(settings) {
        console.log(`Building from ${settings.dataSource} data`)
        // 0. Prepare scene for fade in animation
        d3.select(`#${settings.svgID}`).style('opacity', 0)
        // 1. Specify data table links for each table used (tsv published output from each separate sheet/table)
        const gsTableLinks =   {
            data_flows:        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiOIe0V4uDrpJ3vxk06pPZ2NKwMMPlS0J0XKPYxQAWc14l0QHX3fdhKvbMWXoz---hCLIOkXMnM_vN/pub?gid=1665717612&single=true&output=tsv',
            schema_nodes:      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiOIe0V4uDrpJ3vxk06pPZ2NKwMMPlS0J0XKPYxQAWc14l0QHX3fdhKvbMWXoz---hCLIOkXMnM_vN/pub?gid=726293579&single=true&output=tsv',
            schema_lgas:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiOIe0V4uDrpJ3vxk06pPZ2NKwMMPlS0J0XKPYxQAWc14l0QHX3fdhKvbMWXoz---hCLIOkXMnM_vN/pub?gid=1052998534&single=true&output=tsv'
        }
        const localLinks = {
            data_flows:        '../data/data_flows.tsv',
            schema_nodes:      '../data/schema_nodes.tsv',
            schema_lgas:       '../data/schema_lgas.tsv'
        }
        const dataLinks = settings.dataSource === 'local' ? localLinks : gsTableLinks

        // 2. Asynchronous data load (with Promise.all) and D3 (Fetch API) 
        Promise.all(
            Object.values(dataLinks).map(link => d3.tsv(link))       // Pass in array of d3.tsv loaders with each link
        ).then( rawData => {
            rawData.forEach((tableData, i) => {  parseTable(Object.keys(dataLinks)[i], tableData) })  // a. Parse each loaded data table and store in data.tables object, using the parseTable helper 
            return data
        }).then( async (data) => {
            await applyQuerySettings()              // a. Apply any query strings 
            await transformData()                   // b. Transform data to extract schema and reshape to node-link structure
            await renderVis()                       // c. Render visualisation(s)
            await addInteractions()                 // d. Set additional interactions and animation(s)
        })
        // X. Table data parsing function: trim() header white space and prase numbers with "$" and "," stripped. 
        const parseTable = (tableName, tableData) => {
            data.inputTable[tableName] = tableData.map(row => {
                const newObj = {}
                Object.entries(row).forEach(([key, value]) => {
                    newObj[key.trim()] = isNaN(parseFloat(value.replace(/\$|,/g, ''))) ? value : parseFloat(value.replace(/\$|,/g, '')) 
                })
                return newObj
            })
        };                 
    };


    ////////////////////////////////////
    // 3. PARSE AND WRANGLE DATA     ///
    ////////////////////////////////////

    async function applyQuerySettings(){
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('year'))   vis.state.year = settings.queryParameters.get('year')    
        if (settings.queryParameters.has('orientation'))   settings.layout.orientation = settings.queryParameters.get('orientation')    
    };

    async function transformData() {
        const excludedFields = ['year', 'lga', 'sourceNode', 'targetNode', 'stemLength1', 'stemLength2', 'rankIn' , 'rankOut'] // Non-data fields 
        // 1. Extract lists 
        data.schema.list.lga = data.inputTable.schema_lgas.filter( d => d.wrrg === settings.info.wrrgFullName).map(d => d.lgaLabel).sort()
        data.schema.list.nodeName = data.inputTable.schema_nodes.map(d => d.nodeName)
        data.schema.list.nodeLR = data.inputTable.schema_nodes.map(d => d.nodeName).sort((b,a) => b.xPos - a.xPos)
        data.schema.list.submaterial = Object.keys(data.inputTable.data_flows[0]).filter(d => excludedFields.indexOf(d)  === -1)
        data.schema.list.year = [... new Set(data.inputTable.data_flows.map(d => d.year) )]

        // 2. Create node and link data objects
        const flowYearData = data.inputTable.data_flows.filter(d => d.year === vis.state.year)
        data.schema.list.lga.unshift('all LGAs in GCW')        // Add all LGAs in GCW

        for( region of data.schema.list.lga){
            data.chart.node[region] = {}
            data.chart.link[region] = {}

            for (submaterial of data.schema.list.submaterial){
                data.chart.node[region][submaterial] = []
                data.chart.link[region][submaterial] = []

                // Create node data
                for (nodeObj of data.inputTable.schema_nodes){ 
                    const obj = JSON.parse(JSON.stringify(nodeObj))         // Copy object and add to it
                    obj.inputNodes  =  []
                    obj.outputNodes =  []
                    obj.valueOut =  0
                    obj.valueIn =  0

                    // Loop to record outputs and add up total, and inputs
                    for( dataObj of flowYearData.filter(d => d.lga === region)) {
                        if(dataObj.sourceNode === nodeObj.nodeName){
                            obj.valueOut += dataObj[submaterial]
                            obj.outputNodes.push({
                                target: dataObj.targetNode,
                                value:  dataObj[submaterial]
                            })
                        }

                        if(dataObj.targetNode ===  nodeObj.nodeName){
                            obj.valueIn += dataObj[submaterial]
                            obj.inputNodes.push({
                                target: dataObj.sourceNode,
                                value:  dataObj[submaterial],
                                rank:   flowYearData.filter(d => d.lga === region && d.targetNode ===  dataObj.targetNode && d.sourceNode === dataObj.sourceNode)[0].rankIn
                            })
                        }
                    }
                    // Add the node data object if it has any waste flow
                    obj.value = d3.max([obj.valueOut, obj.valueIn])
                    data.chart.node[region][submaterial].push(obj)
                }

                // Create link data
                for (obj of flowYearData.filter(d => d.lga === region)){
                    if(obj[submaterial] > 0){
                        data.chart.link[region][submaterial].push({
                            source:     obj.sourceNode,
                            target:     obj.targetNode,
                            stemLength1:   obj.stemLength1,
                            stemLength2:   obj.stemLength2,
                            value:      obj[submaterial],
                            rankIn:     obj.rankIn,    
                            rankOut:    obj.rankOut    
                        })
                    }
                } 

                // Loop to re-ranked input nodes for layout
                for( dataObj of data.chart.node[region][submaterial]) { 
                    dataObj.inputNodes = dataObj.inputNodes.sort( (a,b) => settings.layout.orientation === 'portrait' ? a.rank - b.rank : b.rank - a.rank )
                    if(settings.layout.orientation === 'landscape') dataObj.outputNodes.reverse()
                }
            }
        }

        console.log(data.chart.node[vis.state.region][vis.state.material])
        console.log(data.chart.link[vis.state.region][vis.state.material])
    }; // end transformData()


    ////////////////////////////////////////
    // 4. RENDER THE FLOW VISUALISATION  ///
    ////////////////////////////////////////

    async function renderVis(){

        //////////////////////////////////
        // I. SETUP GEOMETRY FROM DATA //
        //////////////////////////////////

        // a. Set dims for SVG based on orientation settings
        settings.dims = settings.dimsByOrientation[settings.layout.orientation]
        const visWidth = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
            visHeight = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom

        // b. Get node and link data for current vis state (i.e. region and material)
        const nodeData = data.chart.node[vis.state.region][vis.state.material],
            linkData = data.chart.link[vis.state.region][vis.state.material],
            totalVolume = d3.sum(nodeData.filter(d => d.type === 'source stream').map(d => d.value))


        ///////////////////////////////
        // II. SPECIFY LAYOUT GROUPS // 
        ///////////////////////////////

        // Layers appended in rendering order
        const svg = d3.select(`#${settings.svgID}`).attr('viewBox', `0 0 ${settings.dims.width} ${settings.dims.height}`),
            svgTitle = svg.append('title').attr('id', 'svg-title'),
            svgDescription = svg.append('title').attr('id', 'svg-description'),
            visGroup =  svg.append('g').classed('chart-group', true).attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`),
            linkGroup = visGroup.append('g').classed('link-group', true),
            nodeGroup = visGroup.append('g').classed('node-group', true),
            annotationGroup = svg.append('g').classed('annotation-group', true)


        ////////////////////////
        // III. ACCESSIBILITY // 
        ////////////////////////

        // a. Setup SVG title and desc for screen reader accessibility
        const svgTitleText = `A graphic showing the volumes of waste flows in ${vis.state.year})`,
            svgDescText = `A graphic showing the volumes of waste flows in ${vis.state.year})`

        d3.select('#svg-title').html(svgTitleText)
        d3.select('#svg-description').html(svgDescText)

        // b. Toggle title so that it doesn't appear as a default tooltip
        svg.on('mouseover', () => document.getElementById('svg-title').innerHTML = null )
            .on('mouseout', () =>  document.getElementById('svg-title').innerHTML = svgTitleText )


        ///////////////////////
        // IV. SETUP SCALES  // 
        ///////////////////////    

        // Note: x and y scales set according to diagram orientation
        switch(settings.layout.orientation){
            case 'portrait':
                vis.scale.nodePosX  = d3.scaleLinear().domain([0, 1]).range([settings.dims.margin.left, settings.dims.width - settings.dims.margin.right])
                vis.scale.nodePosY  = d3.scaleLinear().domain([0, 1]).range([settings.dims.margin.top, settings.dims.height - settings.dims.margin.bottom ])
                break
            case 'landscape':
                vis.scale.nodePosY  = d3.scaleLinear().domain([0, 1]).range([settings.dims.margin.left, settings.dims.width - settings.dims.margin.right])
                vis.scale.nodePosX  = d3.scaleLinear().domain([1, 0]).range([settings.dims.margin.top, settings.dims.height - settings.dims.margin.bottom ])
                break
        }
        vis.scale.nodeSize  = d3.scaleSqrt().domain(d3.extent(nodeData.map(d => d.value))).range([settings.geometry.nodeSize.min, settings.geometry.nodeSize.max])
        vis.scale.linkWidth = d3.scaleLinear().domain(d3.extent(linkData.map(d => d.value))).range([settings.geometry.linkWidth.min, settings.geometry.linkWidth.max])


        //////////////////////
        // V. RENDER NODES  //
        //////////////////////
       
        // Each node has: i) a background circle to cover links underneath, ii) A main 'node' circle and iii) a text label 
        for (nodeObj of nodeData) {
            const group = nodeGroup.append('g')
                .datum(nodeObj)
                .attr('class' , d => `node-group ${helpers.slugify(d.type)} ${helpers.slugify(d.nodeName)}`)
                .attr('transform',  d => settings.layout.orientation === 'portrait' 
                    ?  `translate(${vis.scale.nodePosX(d.xPos)} , ${vis.scale.nodePosY(d.yPos)})`
                        : `translate(${vis.scale.nodePosY(d.yPos)} , ${vis.scale.nodePosX(d.xPos)})`   )

            group.append('circle').datum(nodeObj)
                .attr('class', d => `node-link-cover ${helpers.slugify(d.type)} ${helpers.slugify(d.nodeName)}`)
                .attr('r',  d => vis.scale.nodeSize(d.value))

            group.append('circle').datum(nodeObj)
                .attr('class', d => `node ${helpers.slugify(d.type)} ${helpers.slugify(d.nodeName)}`)
                .attr('r',  d => vis.scale.nodeSize(d.value))
                .style('fill', d => d.colourCSS)
                    .on('click', nodeClick)
                    .on('mouseover', nodeMouseover)
                    .on('mouseout', mouseout)

            const label = group.append('text').classed(`node-label ${helpers.slugify(nodeObj.type)} ${helpers.slugify(nodeObj.nodeName)}`, true)
                .attr('x', 0).attr('y', 0).attr('dy', 0)
                .text(nodeObj.nodeNameShort !== '' ? nodeObj.nodeNameShort : nodeObj.nodeName)
                .call(helpers.wrap, d3.max([vis.scale.nodeSize(nodeObj.value) * 2.75, 140]), 1.1 )

            const labelBBox =  label.node().getBBox(),
                dataLabelYoffset = labelBBox.height < 20 ? 8 : labelBBox.height < 40 ? 4 :  0

            group.append('text').classed(`node-label data ${helpers.slugify(nodeObj.type)} ${helpers.slugify(nodeObj.nodeName)}`, true)
                .attr('x', 0).attr('y',  labelBBox.y +  labelBBox.height + dataLabelYoffset).attr('dy', 0)
                .text(`${helpers.numberFormatters.formatComma(nodeObj.value)} tonnes`)
        }


        ///////////////////////
        // VI. RENDER LINKS  //
        ///////////////////////

        // a. Create link position start and end horizontal offsets (to prevent link overlap and position with spacing)
        for (nodeObj of nodeData){
            // Node output links
            const rankedOutputNodes = nodeObj.outputNodes, 
                outputWidths = rankedOutputNodes.map(d => vis.scale.linkWidth(d.value)),
                cumSumOutputWidths = [0].concat([].slice.call(d3.cumsum(outputWidths))),
                totalOutputWidth = d3.sum(outputWidths) + settings.geometry.flowGap * (outputWidths.length - 1)
                outputOffsetXArray = outputWidths.map((d,i) => (cumSumOutputWidths[i] + d * 0.5 +  i * settings.geometry.flowGap ) - (totalOutputWidth * 0.5))

            nodeObj.startOffsetX = {}
            for (i = 0; i < rankedOutputNodes.length; i++){
                nodeObj.startOffsetX[rankedOutputNodes[i].target] = outputOffsetXArray[i]
            }

            // Node input links
            const rankedInputNodes = nodeObj.inputNodes,
                inputWidths = rankedInputNodes.map(d => vis.scale.linkWidth(d.value)),
                cumSumInputWidths = [0].concat([].slice.call(d3.cumsum(inputWidths))),
                totalInputWidth = d3.sum(inputWidths) + settings.geometry.flowGap * (inputWidths.length - 1)
                inputOffsetXArray = inputWidths.map((d,i) => (cumSumInputWidths[i] + d * 0.5 +  i * settings.geometry.flowGap ) - (totalInputWidth * 0.5))

            nodeObj.endOffsetX = {}
            for (i = 0; i < rankedInputNodes.length; i++){
                nodeObj.endOffsetX[rankedInputNodes[i].target] = inputOffsetXArray[i]
            }
        }

        // b. Add each link
        for( linkObj of linkData){
            const source = linkObj.source, target = linkObj.target,
                sourceNodeObj = nodeData.filter(d => d.nodeName === source)[0],
                targetNodeObj = nodeData.filter(d => d.nodeName === target)[0],
                targetClass = nodeData.filter(d => d.nodeName === target)[0].type
            let sourcePos, targetPos
            switch(settings.layout.orientation){
                case 'portrait':
                    sourcePos = [
                        vis.scale.nodePosX(nodeData.filter(d => d.nodeName === source)[0].xPos) + sourceNodeObj.startOffsetX[target],
                        vis.scale.nodePosY(nodeData.filter(d => d.nodeName === source)[0].yPos)
                    ],
                    targetPos = [
                        vis.scale.nodePosX(nodeData.filter(d => d.nodeName === target)[0].xPos) + targetNodeObj.endOffsetX[source],
                        vis.scale.nodePosY(nodeData.filter(d => d.nodeName === target)[0].yPos)
                    ]
                    break
                case 'landscape':
                    sourcePos = [
                        vis.scale.nodePosX(nodeData.filter(d => d.nodeName === source)[0].xPos) + sourceNodeObj.startOffsetX[target],
                        vis.scale.nodePosY(nodeData.filter(d => d.nodeName === source)[0].yPos) 
                    ],
                    targetPos = [
                        vis.scale.nodePosX(nodeData.filter(d => d.nodeName === target)[0].xPos) + targetNodeObj.endOffsetX[source],
                        vis.scale.nodePosY(nodeData.filter(d => d.nodeName === target)[0].yPos) 
                    ]
                    break
            }


            const group = linkGroup.append('path')
                .datum(linkObj)
                .classed(`link ${helpers.slugify(linkObj.source)} ${helpers.slugify(linkObj.target)} ${helpers.slugify(targetClass)}`, true)
                .attr('d', settings.layout.orientation === 'portrait' ? 
                        vis.linkGenerators.linkVerticalOffset({ 
                            source: sourcePos, 
                            target: targetPos,
                            stemLength1: linkObj.stemLength1,
                            stemLength2: linkObj.stemLength2,
                        }) 
                    : 
                        vis.linkGenerators.linkHorizontalOffset({ 
                            source: sourcePos, 
                            target: targetPos,
                            stemLength1: linkObj.stemLength1,
                            stemLength2: linkObj.stemLength2,
                        }) 
                )
                .style('stroke-width', vis.scale.linkWidth(linkObj.value))
                .on('click', linkClick)
                .on('mouseout', mouseout)
        }

        /////////////////////////
        // VII. ADD ANNOTATION //
        /////////////////////////

        // a. Annotation settings
        settings.annotation = {
            collection: {
                label:      'Waste source streams',
                portrait: {
                    x:       5, 
                    y:       vis.scale.nodePosY(0.05),
                    wrap:    settings.dims.margin.left
                },
                landscape: {
                    x:       vis.scale.nodePosY(0), 
                    y:       settings.dims.height - settings.dims.margin.bottom * 0.25,
                    wrap:    settings.dims.width * 0.2
                }
            },
            management: {
                label:      'Waste and resource recovery infrastructure',
                portrait: {
                    x:       5, 
                    y:       vis.scale.nodePosY(0.35),
                    wrap:    settings.dims.margin.left
                },
                landscape: {
                    x:       vis.scale.nodePosY(0.35), 
                    y:       settings.dims.height - settings.dims.margin.bottom * 0.25,
                    wrap:     settings.dims.width * 0.4
                }
            },
            end: {
                label:      'End destination',
                portrait: {
                    x:       5, 
                    y:       vis.scale.nodePosY(0.9),
                    wrap:    settings.dims.margin.left
                },
                landscape: {
                    x:       vis.scale.nodePosY(0.85), 
                    y:       settings.dims.height - settings.dims.margin.bottom* 0.25,
                    wrap:     settings.dims.width * 0.20
                }
            },
            'waste-disposal': {
                label:      'Waste disposal',
                portrait: {
                    x:       vis.scale.nodePosX(0.225), 
                    y:       settings.dims.height - settings.dims.margin.bottom,
                    wrap:    settings.dims.width * 0.2
                },
                landscape: {
                    x:       vis.scale.nodePosY(1.025), 
                    y:       vis.scale.nodePosX(0.1),
                    wrap:     settings.dims.margin.right
                }
            },
            'waste-to-energy': {
                label:      'Waste to energy',
                portrait: {
                    x:       vis.scale.nodePosX(0.425), 
                    y:       settings.dims.height - settings.dims.margin.bottom,
                    wrap:    settings.dims.width * 0.125
                },
                landscape: {
                    x:       vis.scale.nodePosY(1.025), 
                    y:       vis.scale.nodePosX(0.295),
                    wrap:    settings.dims.margin.right
                }
            },
            'recovered-product': {
                label:      'Products from recovered resources',
                portrait: {
                    x:       vis.scale.nodePosX(0.8), 
                    y:       settings.dims.height - settings.dims.margin.bottom,
                    wrap:    settings.dims.width * 0.4
                },
                landscape: {
                    x:       vis.scale.nodePosY(1.0251), 
                    y:       vis.scale.nodePosX(0.8),
                    wrap:    settings.dims.margin.right
                }
            },
        }

        // b. Add section labels
        const sectionLabels = ['collection', 'management', 'end']
        sectionLabels.forEach(labelName => {
            const group  = annotationGroup.append('g')
                .attr('transform', `translate(${settings.annotation[labelName][settings.layout.orientation].x}, ${settings.annotation[labelName][settings.layout.orientation].y})`)
            group.append('text').classed('label-section', true)
                .attr('x',0).attr('y',0).attr('dy',0)
                .text(settings.annotation[labelName].label)
                .call(helpers.wrap, settings.annotation[labelName][settings.layout.orientation].wrap, 1.1, false)
        })

        annotationGroup.append('g')
           .attr('transform', `translate(${settings.annotation['collection'][settings.layout.orientation].x}, ${settings.annotation['collection'][settings.layout.orientation].y + 28})`)
            .append('text').classed('label-section data', true)
            .attr('x',0).attr('y',0).attr('dy',0)
            .text(`${helpers.numberFormatters.formatComma(totalVolume)} tonnes collected`)


        // c. Outcome labels
        const outcomeLabels = ['waste-disposal', 'waste-to-energy', 'recovered-product'],
            outcomeTypes = [
                ['waste disposal'],
                ['waste to energy'], 
                ['recovered product', 'export']
            ]
       
        outcomeLabels.forEach((labelName, i) => {
            const group  = annotationGroup.append('g')
                .attr('transform', `translate(${settings.annotation[labelName][settings.layout.orientation].x}, ${settings.annotation[labelName][settings.layout.orientation].y})`)
            const label = group.append('text').classed(`label-end-destination ${labelName}`, true)
                .attr('x',0).attr('y',0).attr('dy',0)
                .text(settings.annotation[labelName].label)
                .call(helpers.wrap, settings.annotation[labelName][settings.layout.orientation].wrap, 1.1, false)

            const labelBBox = label.node().getBBox(), 
                groupTotal = d3.sum(nodeData.filter(d => outcomeTypes[i].indexOf(d.type) > -1).map(d => d.value))
            group.append('text').classed(`label-end-destination data ${labelName}`, true)
                .attr('x',0).attr('y', -labelBBox.y + labelBBox.height - 25)
                .text(`${helpers.numberFormatters.formatComma(groupTotal)} tonnes or`)
            group.append('text').classed(`label-end-destination data ${labelName}`, true)
                .attr('x',0).attr('y', -labelBBox.y + labelBBox.height - 6)
                .text(`${helpers.numberFormatters.formatPct1dec(groupTotal/totalVolume)} of all waste`)
        })



        //////////////////////////////////////////
        // VIII.  NODE-LINK INTERACTION METHODS //
        ///////////////////////////////////////////

        // Node and link interaction
        function nodeClick(ev, d){
            // a. Populate modal informiton
            d3.select('.modal-title').html(d.nodeName)
            d3.select('.modal-content').html(d.modalContent)

            // b. Include any embedded dashboard content (powerBI)
            d3.selectAll('.powerBI-embed-container *').remove()
            if(d.embeddedURL !== ''){
                d3.select('.powerBI-embed-container').append('iframe')
                    .attr('src', d.embeddedURL)
            }
            // c. Blur the main content and bring in the modal
            vis.methods.ui.openModal()
        };

        // Node hover events
        function nodeMouseover(ev, d){
            // a. Highlight relevant nodes and links
            const nodeClass = helpers.slugify(d.nodeName)
            let inputNodeClass = d.inputNodes.map(d => `.node.${helpers.slugify(d.target)},  .node-label.${helpers.slugify(d.target)} `).toString(','),
                outputNodeClass = d.outputNodes.map(d => `.node.${helpers.slugify(d.target)}, .node-label.${helpers.slugify(d.target)}`).toString(',')
            inputNodeClass = d.inputNodes.length === 0 ? '' : `,${inputNodeClass}`
            outputNodeClass = d.outputNodes.length === 0 ? '' : `,${outputNodeClass}`

            const nodeSelection = `.${nodeClass}, ${inputNodeClass} ${outputNodeClass}`
            d3.selectAll(`.link, .node, .node-label`).style('opacity', 0.05)
            d3.selectAll(`.link.${nodeClass}`).style('opacity', 1)
            d3.selectAll(`.${nodeClass} ${inputNodeClass} ${outputNodeClass}`).style('opacity', 1)

            // a. Show tooltip
            showTooltip(ev, d, this, 'node')
        };

        // Link hover events
        function linkClick(ev, d){
            // a. Highlight relevant nodes and links
            const sourceClass = helpers.slugify(d.source),
                targetClass =    helpers.slugify(d.target)
            d3.selectAll(`.link, .node, .node-label`).style('opacity', 0.05)
            d3.selectAll(`.link.${sourceClass}.${targetClass}, .node.${sourceClass}, .node.${targetClass}, .node-label.${sourceClass}, .node-label.${targetClass}`).style('opacity', 1)
            // ab. SHow tooltip
            showTooltip(ev, d, this, 'link')
        };

        // Mouseout for node add links to reset
        function mouseout(){
            d3.selectAll(`.link, .node, .node-label, .node-link-cover`).style('opacity', null)
            d3.select('.tooltip').style('opacity', null)
        };

        // Tooltip
        function showTooltip(ev, d, el, type){
            const tooltip = {
                width: document.querySelector('.tooltip').offsetWidth, 
                height: document.querySelector('.tooltip').offsetHeight
            }
            const mousePos = {x: ev.offsetX, y: ev.offsetY}

            switch(type){
                case 'node':
                    d3.select('.tooltip-header').html(`${d.nodeName} estimated volume in ${vis.state.year} (${vis.state.material})`)
                    d3.select('.tooltip-volume').html(`${helpers.numberFormatters.formatComma(d.value)} tonnes`)
                    d3.select('.tooltip-detail').html(`${helpers.numberFormatters.formatPct1dec(d.value / totalVolume)} of total waste <p class = "tooltip-more">Click on this node to learn more</p>`)
                    break

                case 'link':
                    d3.select('.tooltip-header').html(`Estimated volume from ${d.source}} to ${d.target} in ${vis.state.year} (for ${vis.state.material})`)
                    d3.select('.tooltip-volume').html(`${helpers.numberFormatters.formatComma(d.value)} tonnes`)
                    d3.select('.tooltip-detail').html(`${helpers.numberFormatters.formatPct1dec(d.value / totalVolume)} of total waste`)
                    break
            }

            d3.select('.tooltip')
                .style('top', `${mousePos.y }px` )
                .style('left', `${mousePos.x - tooltip.width * 0.25 }px` )
                .style('opacity', 1)
        };


    }; // end renderVis()

    async function addInteractions(){
        // I. Fade in graphic when rendered
        d3.selectAll(`#${settings.svgID}, .title-block`).style('opacity', 0)
            .transition().duration(800)
            .style('opacity', null)

        // II. Fill dropdown containers 
        for( region of data.schema.list.lga){
            d3.select('#region-selector').append('option')
                .attr('value', region).html(region)
        }
        for( year of data.schema.list.year){
            d3.select('#year-selector').append('option')
                .attr('value', year).html(year)
        }
        for( submaterial of data.schema.list.submaterial){
            d3.select('#material-selector').append('option')
                .attr('value', submaterial).html(submaterial)
        }

        // III. Ensure each dropdown is set to initialised vis.state settings
        document.querySelector('#region-selector').value = vis.state.region 
        document.querySelector('#year-selector').value = vis.state.year
        document.querySelector('#material-selector').value = vis.state.material

        // IV. Add event listeners
        d3.selectAll('.data-selector').on('change', vis.methods.ui.updateVis)
        d3.select('.modal-close-button').on('click', vis.methods.ui.closeModal)

    }; // end addInteractions()


    /////////////////////////////
    /// X. HELPER FUNCTIONS   ///
    /////////////////////////////

    const helpers= {
        numberFormatters: {
            formatComma:           	d3.format(",.0f"),
            formatComma1dec:       	d3.format(",.1f"),
            formatComma2dec:       	d3.format(",.2f"),
            formatInteger:         	d3.format(".0f"),   
            formatCostInteger:     	d3.format("$,.0f"),  
            formatCost1dec:        	d3.format("$,.1f"),  
            formatPct:          	d3.format(".0%"), 
            formatPct1dec:          d3.format(".1%")  
        },
        numberParsers: {
            parseDateSlash: d3.timeParse("%d/%m/%Y")
        },
        roundToNearest: {
            hundred:      (d) => Math.round(d / 100) * 100,
            thousand:     (d) => Math.round(d / 1000) *1000
        },
        slugify: function (str) {
            str = str.replace(/^\s+|\s+$/g, '').toLowerCase(); // trim           
            const from = "??????????????????????????????????????????????/_,:;",      // remove accents, swap ?? for n, etc
                to   = "aaaaeeeeiiiioooouuuunc------"
            for (let i=0, l=from.length ; i<l ; i++) {
                str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
            }
            str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                .replace(/-+/g, '-'); // collapse dashes
            return str;
        }, 
        wrap: function(text, width, lineHeight, centerVertical = true) {
            text.each(function() {
                let text = d3.select(this),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    y = text.attr("y"),
                    x = text.attr("x"),
                    fontSize = parseFloat(text.style("font-size")),
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));

                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("y",  y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }                    
                }            
                if(centerVertical){
                    text.style("transform",  "translateY(-"+(6 * (lineNumber))+"px)")
                }
            })
        }
    }