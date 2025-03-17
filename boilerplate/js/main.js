//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //map frame dimensions
    var width = 960,
    height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([3.64, 33.6])
        
        .rotate([99.18, -12.73, 0])
        
        .parallels([29.5, 45.5])
        
        .scale(1967.68)
        
        .translate([width / 2, height / 2]);
    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];    
    promises.push(d3.csv("data/mn_counties.csv")); //load attributes from csv    
    promises.push(d3.json("data/counties_shapefile.topojson")); //load spatial data
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            county_data = data[1]

        //Translates topojson to geojson
        var counties_geojson = topojson.feature(county_data, county_data.objects.counties_shapefile);
        
        //Add counties to map
        var counties = map.append("path")
            .datum(counties_geojson)
            .attr("class", "counties")
            .attr("d", path);
    }
};