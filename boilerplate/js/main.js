//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/mn_counties.csv"),                    
                    d3.json("data/counties_shapefile.topojson")                 
                    ];    
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0],
            counties = data[1]

        //Translates topojson to geojson
        var counties_geojson = topojson.feature(counties, counties.objects.counties_shapefile);
        console.log(counties_geojson);
    }
};