///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///                                                 ///
/// A CUSTOM WASTE AND RESOURCE RECOVVERY FLOWS     ///
/// VISUALISATION FOR GRAMPIANS CENTRAL WEST WRGG   ///
///                                                 ///
/// ----------------------------------------------  ///
/// VERSION 0.1                                     ///
/// Made by Little Sketches in October 2021         ///
///                                                 ///
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////


// 1. Instantiate settings and data objects
    const settings = { 
        svgID:                  'flow-vis',
        year:                   2019,
        info: {
            wrrgFullName:       'Grampians Central West Waste and Resource Recovery Group'
        },
        layout: {
            showTitle:          true
        },
        dims: {
            width:              1080,
            height:             1920,
            margin: {
                top:            30,
                bottom:         10,
                left:           40,
                right:          40
            }
        },
        geometry: {            
            nodePos:            {},
            nodeSize:           {min: 25, max: 40},
            linkWidth:          {min: 5, max: 40}
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
        state:  {
            region:         'All LGAs',
            material:       'All materials',
            year:           ''
        },
        scale:  {},
        linkGenerators: {}
    }


    // Call build function
    buildFromGSheetData(settings)

    // Load data from TSV files from GSheet
    function buildFromGSheetData(settings) {
        console.log('Building from tsv data')
        // 0. Prepare scene for fade in animation
        d3.select(`#${settings.svgID}`).style('opacity', 0)

        // 1. Specify data table links for each table used (tsv published output from each separate sheet/table)
        const gsTableLinks =   {
            data_flows:        'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiOIe0V4uDrpJ3vxk06pPZ2NKwMMPlS0J0XKPYxQAWc14l0QHX3fdhKvbMWXoz---hCLIOkXMnM_vN/pub?gid=1665717612&single=true&output=tsv',
            schema_nodes:      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiOIe0V4uDrpJ3vxk06pPZ2NKwMMPlS0J0XKPYxQAWc14l0QHX3fdhKvbMWXoz---hCLIOkXMnM_vN/pub?gid=726293579&single=true&output=tsv',
            schema_lgas:       'https://docs.google.com/spreadsheets/d/e/2PACX-1vRiOIe0V4uDrpJ3vxk06pPZ2NKwMMPlS0J0XKPYxQAWc14l0QHX3fdhKvbMWXoz---hCLIOkXMnM_vN/pub?gid=1052998534&single=true&output=tsv'
        }

        // 2. Asynchronous data load (with Promise.all) and D3 (Fetch API) 
        Promise.all(
            Object.values(gsTableLinks).map(link => d3.tsv(link))       // Pass in array of d3.tsv loaders with each link
        ).then( rawData => {
            rawData.forEach((tableData, i) => {  parseTable(Object.keys(gsTableLinks)[i], tableData) })  // a. Parse each loaded data table and store in data.tables object, using the parseTable helper 

            // data.inputTable['data_flows'] = dataFlows
            // data.inputTable['schema_nodes'] = schemaNodes
            // data.inputTable['schema_lgas'] = lgaSchema
            return data
        }).then( async (data) => {
            // 3. Initiate vis build sequence with data now loaded
            await applyQuerySettings(settings)                  // a. Update settings if a query string is passed in
            await transformData()                               // b. Transform data to extract schema and reshape to node-link structure
            await renderVis()                                   // c. Render visualisation(s)
            // await addInteractions()                          // d. Set additional interactions and animation(s)
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
    // 1. PARSE AND WRANGLE DATA     ///
    ////////////////////////////////////

    async function applyQuerySettings(settings){
        // i. Check for query parameters and update material. A date set by the query selector is set while parsing input data 
        settings.queryParameters = new URLSearchParams(window.location.search)
        if (settings.queryParameters.has('year'))   settings.year = settings.queryParameters.get('year')  
        
    };

    async function transformData() {

        // 1. Extract lists 
        data.schema.list.lga = data.inputTable.schema_lgas.filter( d => d.wrrg === settings.info.wrrgFullName).map(d => d.lgaLabel).sort()
        data.schema.list.nodeName = data.inputTable.schema_nodes.map(d => d.nodeName)
        const excludedFields = ['year', 'lga', 'sourceNode', 'targetNode', 'vLength1', 'vLength2']

        data.schema.list.submaterial = Object.keys(data.inputTable.data_flows[0]).filter(d => excludedFields.indexOf(d)  === -1)

        // 2. Create node data objects
        const nodeYearData = data.inputTable.data_flows.filter(d => d.year === settings.year)
        data.schema.list.lga.unshift('All LGAs')        // Add All LGAs

        for( region of data.schema.list.lga){
            data.chart.node[region] = {}
            data.chart.link[region] = {}

            for( submaterial of data.schema.list.submaterial){
                data.chart.node[region][submaterial] = []
                data.chart.link[region][submaterial] = []

                // Nodes
                for (nodeObj of data.inputTable.schema_nodes){ 
                    const obj = JSON.parse(JSON.stringify(nodeObj))         // Copy object and add to it
                    obj.inputNodes  =  []
                    obj.outputNodes =  []
                    obj.valueOut =  0
                    obj.valueIn =  0

                    // Loop to record outputs and add up total, and input
                    for( dataObj of nodeYearData.filter(d => d.lga === region)) {
                        if(dataObj.sourceNode === nodeObj.nodeName){
                            obj.valueOut += dataObj[submaterial]
                            obj.outputNodes.push({
                                target: dataObj.targetNode,
                                value:  dataObj[submaterial]  
                            })
                        }

                        if(dataObj.targetNode ===  nodeObj.nodeName){
                            obj.valueIn += dataObj.value  
                            obj.outputNodes.push({
                                target: dataObj.sourceNode,
                                value:  dataObj[submaterial],
                            })
                        }
                    }
                    // Add the node data object if it has any waste flow
                    obj.value = d3.max([obj.valueOut, obj.valueIn])
                    data.chart.node[region][submaterial].push(obj)

                }

                // Links
                for (obj of nodeYearData.filter(d => d.lga === region)){
                    data.chart.link[region][submaterial].push({
                        source: obj.sourceNode,
                        target: obj.targetNode,
                        vLength1: obj.vLength1,
                        vLength2: obj.vLength2,
                        value:  obj[submaterial]    
                    })
                } 
            }
        }


    }; // end transformData()


    ////////////////////////////////////////
    // 2. RENDER THE FLOW VISUALISATION  ///
    ////////////////////////////////////////

    async function renderVis(){
        // 0. SETUP GEOMETRY FROM DATA
        const nodeData = data.chart.node[vis.state.region][vis.state.material],
            linkData = data.chart.link[vis.state.region][vis.state.material]
        const visWidth = settings.dims.width - settings.dims.margin.left - settings.dims.margin.right,
            visHeight = settings.dims.height - settings.dims.margin.top - settings.dims.margin.bottom

        // 1. SPECIFY LAYOUT GROUPS: Layers appended in rendering order
        const svg = d3.select(`#${settings.svgID}`).attr('viewBox', `0 0 ${settings.dims.width} ${settings.dims.height}`),
            svgTitle = svg.append('title').attr('id', 'svg-title'),
            svgDescription = svg.append('title').attr('id', 'svg-description'),
            visGroup =  svg.append('g').classed('chart-group', true).attr('transform', `translate(${settings.dims.margin.left}, ${settings.dims.margin.top})`),
            linkGroup = visGroup.append('g').classed('link-group', true),
            nodeGroup = visGroup.append('g').classed('node-group', true),
            annotationGroup = svg.append('g').classed('annotation-group', true)

        // 2. A11Y: Setup title and desc for screen reader accessibility
        const svgTitleText = `A graphic showing the volumes of waste flows in ${settings.year})`,
            svgDescText = `A graphic showing the volumes of waste flows in ${settings.year})`

        d3.select('#svg-title').html(svgTitleText)
        d3.select('#svg-description').html(svgDescText)

        // Toggle title so that it doesn't appear as a default tooltip
        svg.on('mouseover', () => document.getElementById('svg-title').innerHTML = null )
            .on('mouseout', () =>  document.getElementById('svg-title').innerHTML = svgTitleText )

        // 3. SETUP SCALES
        vis.scale.nodePosX  = d3.scaleLinear().domain([0, 1]).range([settings.dims.margin.left, settings.dims.margin.left + visWidth])
        vis.scale.nodePosY  = d3.scaleLinear().domain([0, 1]).range([settings.dims.margin.top, settings.dims.margin.left + visHeight])
        vis.scale.nodeSize  = d3.scaleSqrt().domain(d3.extent(nodeData.map(d => d.value))).range([settings.geometry.nodeSize.min, settings.geometry.nodeSize.max])


        // 4. RENDER NODES
        for (nodeObj of nodeData) {
            const group = nodeGroup.append('g').classed(`node-group ${helpers.slugify(nodeObj.type)} ${helpers.slugify(nodeObj.nodeName)}`, true)

            group.append('circle').classed(`node-bg ${helpers.slugify(nodeObj.type)} ${helpers.slugify(nodeObj.nodeName)}`, true)
                .attr('cx', vis.scale.nodePosX(nodeObj.xPos))
                .attr('cy', vis.scale.nodePosY(nodeObj.yPos))
                .attr('r',  vis.scale.nodeSize(nodeObj.value))
                .style('fill', nodeObj.colourCSS)

            group.append('text').classed(`node-label ${helpers.slugify(nodeObj.type)} ${helpers.slugify(nodeObj.nodeName)}`, true)
                .attr('x', vis.scale.nodePosX(nodeObj.xPos))
                .attr('y', vis.scale.nodePosY(nodeObj.yPos))
                .attr('dy', 0)
                .text(nodeObj.nodeNameShort !== '' ? nodeObj.nodeNameShort : nodeObj.nodeName)
                .call(helpers.wrap, 140, 1.1, true )
        }


        // 5. RENDER LINKS
        vis.linkGenerators = {
            straightLink: d3.line()
                .x(d => d.x)
                .y(d => d.y),
            linkVertical: d3.linkVertical()    // Bezier link generator accepting object {source: [x,y], and   target [x,y] }
                .source(d => d.source)
                .target(d => d.target),  

            linkVerticalOffset:  (obj) => {
                const totalLinkHeight = Math.abs(obj.target[1] - obj.source[1]),
                    stem1_height = totalLinkHeight * obj.vLength1,
                    stem2_height = totalLinkHeight * (1 - obj.vLength2)

                const vertStem1 = `M${obj.source[0]} ${obj.source[1]} v${stem1_height}`,
                    vertStem2 = `v${stem2_height}`,
                    curvePath = vis.linkGenerators.linkVertical({
                        source: [obj.source[0],  obj.source[1] + stem1_height],
                        target: [obj.target[0],  obj.target[1] - stem2_height]
                    })
                const path = `${vertStem1} ${curvePath} ${vertStem2}`
                return path
            },     
        }

        console.log(data.chart.link[region])
        for( linkObj of linkData){

            const source = linkObj.source,
                target = linkObj.target,
                sourcePos = [
                    vis.scale.nodePosX(nodeData.filter(d => d.nodeName === source)[0].xPos),
                    vis.scale.nodePosY(nodeData.filter(d => d.nodeName === source)[0].yPos)
                ],
                targetPos = [
                    vis.scale.nodePosX(nodeData.filter(d => d.nodeName === target)[0].xPos),
                    vis.scale.nodePosY(nodeData.filter(d => d.nodeName === target)[0].yPos)
                ]

            const group = linkGroup.append('path')
                .classed(`link ${helpers.slugify(linkObj.source)} ${helpers.slugify(linkObj.target)}`, true)
                .attr('d', vis.linkGenerators.linkVerticalOffset({ 
                        source: sourcePos, 
                        target: targetPos,
                        vLength1: linkObj.vLength1,
                        vLength2: linkObj.vLength2,
                    }) 
                )


        }



    }; // end renderVis()

    async function addInteractions(){
        // Fade in graphic when rendered
        d3.select(`#${settings.svgID}`)
            .transition().duration(500)
            .style('opacity', null)
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
            const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;",      // remove accents, swap ñ for n, etc
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
                    text.style("transform",  "translateY(-"+(10 * (lineNumber))+"px)")
                }
            })
        }
    }