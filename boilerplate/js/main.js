(function() {

    //Pseudo-global variables
    var attArray =["2020 Pop","2024 Pop", "2020-2024 Pop Change"];
    var expressed = attArray[2];

    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = 900,
        height = 500;

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([-94.44095746573984, 45.74048895721964 ])
            .rotate([0, 0, 0])
            .parallels([-25.5, 27.44])
            .scale(8000)
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

            console.log(counties_geojson);

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
    function setChart(csvData, colorScale) {
        //Chart frame dimensions
        var chartWidth = 960,
            chartHeight = 460;

        //Create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
    }

})();

