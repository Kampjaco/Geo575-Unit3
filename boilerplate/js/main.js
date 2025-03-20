//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 1760,
    height = 860;

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
    promises.push(d3.csv("data/mn_counties.csv")); //load attributes from csv    
    promises.push(d3.json("data/counties_shapefile.topojson")); //load spatial data
    promises.push(d3.json("data/US_StateBoundaries_Project.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            county_data = data[1],
            state_data = data[2]


        //Translates topojson to geojson
        var counties_geojson = topojson.feature(county_data, county_data.objects.counties_shapefile).features;
        var states_geojson = topojson.feature(state_data, state_data.objects.US_StateBoundaries_Project);

        console.log(counties_geojson);

                //Add counties to map
        var counties = map.selectAll(".counties")
            .data(counties_geojson)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", function(d) {
                return "counties " + d.properties.COUNTY_NAM
            });

        //Add US states to map
        var states = map.append("path")
            .datum(states_geojson)
            .attr("class", "states")
            .attr("d", path);
        

    }
};