(function() {

    //Pseudo-global variables
    var attArray =["2020 Pop","2024 Pop", "2020-2024 Pop Change"];
    var expressed = attArray[2];

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * 0.5,
        height = window.innerHeight * 0.95;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([-94.44095746573984, 45.74048895721964 ])
            .rotate([-0.5, 0, 0])
            .parallels([-25.5, 27.44])
            .scale(6500)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [];    
        promises.push(d3.csv("data/mn_counties_act10.csv")); //load attributes from csv    
        promises.push(d3.json("data/counties_shapefile.topojson")); //load spatial data
        promises.push(d3.json("data/US_StateBoundaries_Project.topojson")); //load spatial data
        Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0],
                county_data = data[1],
                state_data = data[2];


            //Translates topojson to geojson
            var counties_geojson = topojson.feature(county_data, county_data.objects.counties_shapefile).features;
            var states_geojson = topojson.feature(state_data, state_data.objects.US_StateBoundaries_Project);

            //Add US states to map
            var states = map.append("path")
                .datum(states_geojson)
                .attr("class", "states")
                .attr("d", path);

            //Join CSV data to GeoJSON enumeration units
            counties_geojson = joinData(counties_geojson, csvData);

            //Create color scale
            var colorScale = makeColorScale(csvData);

            //Add enumeration units to map
            setEnumerationUnits(counties_geojson, map, path, colorScale);

            //Add coordinated visualization to the map
            setChart(csvData, colorScale);
        };
    }

    //Function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            "#d73027",
            "#f46d43",
            "#fdae61",
            "#fee090",
            "#e0f3f8",
            "#abd9e9",
            "#74add1",
            "#4575b4"
        ];

        // Extract min and max values
        var min = d3.min(data, d => parseFloat(d[expressed]));
        var max = d3.max(data, d => parseFloat(d[expressed]));

        // Define threshold values for classification, equal interval
        var breakpoints = [
            -6,
            -4,
            -2,
            0,
            2,
            4,
            6
        ];

        // Create a threshold scale
        var colorScale = d3.scaleThreshold()
            .domain(breakpoints)
            .range(colorClasses);

        console.log("Breakpoints:", breakpoints);

        return colorScale;
    }

    function joinData(counties_geojson, csvData) {

        for(var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i];
            var csvKey = csvRegion.County; //CSV primary key

            //Loop throuhg geojson regions to find correct region
            for(var a=0; a < counties_geojson.length; a++) {
                var geojsonProps = counties_geojson[a].properties;
                var geojsonKey = geojsonProps.COUNTY_NAM;

                //When primary keys match, transfer csv data to geojson properties object
                if(geojsonKey == csvKey) {
                    //Assign all attributes and values
                    attArray.forEach(function(attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attrivute value
                        geojsonProps[attr] = val; //assign attrivute and value to geojson properties
                    });
                };
            };
        };

        return counties_geojson;

    }

    function setEnumerationUnits(counties_geojson, map, path, colorScale) {
        //Add counties to map
        var counties = map.selectAll(".counties")
            .data(counties_geojson)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", function(d) {
                return "counties " + d.properties.COUNTY_NAM
            })
            .style("fill", function(d) {
                return colorScale(d.properties[expressed]);
            });
    }

    //Function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        // Sort the data in descending order
        var sortedData = csvData.sort((a, b) => b[expressed] - a[expressed]);

        // Extract the top 5 (highest values) and bottom 5 (lowest values)
        var top5 = sortedData.slice(0, 5);
        var bottom5 = sortedData.slice(-5);
        var filteredData = bottom5.concat(top5); // Combine them

        // Create a scale to size bars proportionally to frame and for the axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([-8, 10]);

        // Set bars for only the top 5 and bottom 5 counties
        var bars = chart.selectAll(".bar")
            .data(filteredData)
            .enter()
            .append("rect")
            .sort((a, b) => b[expressed] - a[expressed])
            .attr("class", d => "bar " + d.County)
            .attr("width", chartInnerWidth / filteredData.length - 1)
            .attr("x", (d, i) => i * (chartInnerWidth / filteredData.length) + leftPadding)
            .attr("height", d => Math.abs(yScale(d[expressed]) - yScale(0))) // Height is absolute difference from zero
            .attr("y", d => d[expressed] >= 0 ? yScale(d[expressed]) : yScale(0)) // Positive bars go up, negative bars go down
            .style("fill", d => colorScale(d[expressed]));

        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(filteredData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.County;
            })
            .attr("text-anchor", "middle")
            .attr("x", (d, i) => i * (chartWidth / filteredData.length) + 45) 
            .attr("y", d => {
                return d[expressed] >= 0 
                    ? yScale(d[expressed]) - 5  // Position text above positive bars
                    : yScale(d[expressed]) + 15; // Position text below negative bars
            })
            .text(function(d){
                return d[expressed];
            });

        //County labels within the bars
        var countyLabels = chart.selectAll(".countyLabel")
            .data(filteredData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", d => "countyLabel " + d.County)
            .attr("x", (d, i) => i * (chartWidth / filteredData.length) + 20)
            .attr("y", d => {
                return d[expressed] >= 0 
                    ? yScale(.25)  // Position text above positive bars
                    : yScale(-.50); // Position text below negative bars
            })
            .attr("dy", "0.35em") // Adjusts text slightly for better vertical centering
            .attr("transform", function(d, i) {
                var x = d[expressed] >=0
                    ? i * (chartWidth / filteredData.length) + (chartWidth / filteredData.length) / 2 -60
                    : i * (chartWidth / filteredData.length) + (chartWidth / filteredData.length) / 2 + 55
                var y = d[expressed] >= 0 
                    ? yScale(d[expressed]) + (yScale(0) - yScale(d[expressed])) / 2 + 35
                    : yScale(d[expressed]) - (yScale(d[expressed]) - yScale(0)) / 2 - 5
                return `rotate(-45, ${x}, ${y})`; // Rotates -45 degrees around the label's position
            })
            .text(d => d.County)

        // Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 200)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Top 5 and Bottom 5 Population Change % in MN Counties (2020-2024)");

        // Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", chartInnerWidth / 2 -45)
            .attr("y", 60)
            .attr("class", "subTitle")
            .text("Divided into categories by 2%");


        // Create vertical axis generator
        var yAxis = d3.axisLeft().scale(yScale);

        // Place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        // Create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

    };



})();

