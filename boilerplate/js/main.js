(function() {

    //Pseudo-global variables
    var attArray =["1970 - 1980", "1980 - 1990", "1990 - 2000", "2000 - 2010", "2010 - 2020"];
    var expressed = attArray[0];

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    // Create a scale to size bars proportionally to frame and for the axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([-25, 70]);

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
        promises.push(d3.csv("data/lab2_mn_counties.csv")); //load attributes from csv    
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

            //Creates dropdown of attributes
            createDropdown(csvData);
        };
    }

    //Function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            "#b2182b",
            "#d6604d",
            "#f4a582",
            "#fddbc7",
            "#f7f7f7",
            "#d1e5f0",
            "#92c5de",
            "#4393c3",
            "#2166ac"
        ];

        // Define threshold values for classification, equal interval
        var breakpoints = [
            -15,
            -10,
            -5,
            0,
            5,
            10,
            20,
            40
        ];

        // Create a threshold scale
        var colorScale = d3.scaleThreshold()
            .domain(breakpoints)
            .range(colorClasses);

        return colorScale;
    }

    function joinData(counties_geojson, csvData) {

        for(var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i];
            var csvKey = csvRegion.COUNTY; //CSV primary key

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
            })
    }

    //Function to create coordinated bar chart
    function setChart(csvData, colorScale){
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

        //Get filtered data to selected attribute
        var filteredData = getFilteredData(csvData)

        // Set bars for only the top 5 and bottom 5 counties
        var bars = chart.selectAll(".bar")
            .data(filteredData)
            .enter()
            .append("rect")
            .sort((a, b) => b[expressed] - a[expressed])
            .attr("class", d => "bar " + d.County)
            .attr("width", chartInnerWidth / filteredData.length - 1);

        //annotate bars with attribute value text
        var numbers = chart.selectAll(".numbers")
            .data(filteredData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "numbers " + d.COUNTY;
            })
            .attr("text-anchor", "middle")
            

        var chartTitle = chart.append("text")
            .attr("x", chartWidth / 2) // Centers title horizontally
            .attr("y", 40)
            .attr("class", "chartTitle")
            .attr("text-anchor", "middle") // Ensures text is centered around the x position


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

        updateChart(bars, numbers, csvData.length, colorScale);

    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Decade");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var counties = d3.selectAll(".counties")
            .style("fill", function(d){            
                var value = d.properties[expressed];            
                if(value) {
                    console.log(d, value)                
                    return colorScale(value);            
                } else {
                    console.log(d, value)                     
                    return "#ccc";
                               
                }    
            });
        // Set bars for only the top 5 and bottom 5 counties
        var bars = d3.selectAll(".bar")
            .data(filteredData = getFilteredData(csvData))
            .sort((a, b) => b[expressed] - a[expressed])
            .attr("width", chartInnerWidth / filteredData.length - 1);
        
        var numbers = d3.selectAll(".numbers")
            .data(filteredData = getFilteredData(csvData))
            .sort((a, b) => b[expressed] - a[expressed])


        updateChart(bars, numbers, csvData.length, colorScale)
  
    };

    function updateChart(bars, numbers, n, colorScale) {
        bars.attr("x", (d, i) => i * (chartInnerWidth / 10) + leftPadding)
            .attr("height", d => Math.abs(yScale(d[expressed]) - yScale(0))) // Height is absolute difference from zero
            .attr("y", d => d[expressed] >= 0 ? yScale(d[expressed]) : yScale(0)) // Positive bars go up, negative bars go down
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#00000";
                            
                }  
            });

            numbers.attr("x", (d, i) => i * (chartInnerWidth / 10) + leftPadding + (chartInnerWidth / 10) / 2)
            .attr("y", d => {
                return d[expressed] >= 0 
                    ? yScale(d[expressed]) - 5  // Position text above positive bars
                    : yScale(d[expressed]) + 15; // Position text below negative bars
            })
            .text(function(d){
                return d[expressed];
            });
            //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text("Highest and Lowest Population Change Percentage in MN Counties Between " + expressed)
            .attr("x", chartWidth / 2) // Centers title horizontally
            .attr("text-anchor", "middle")
    }

    //Gets top 5 and bottom 5 population % changes for current attribute
    function getFilteredData(csvData) {

        var sortedData = csvData.sort((a, b) => b[expressed] - a[expressed]);

        // Extract the top 5 (highest values) and bottom 5 (lowest values)
        var top5 = sortedData.slice(0, 5);
        var bottom5 = sortedData.slice(-5);
        var filteredData = bottom5.concat(top5);

        return filteredData;
    }



})();

