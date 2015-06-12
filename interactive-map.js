var StaticMap;
var ZoomableMap;

!function() {
    StaticMap = function(parameters) {
        "use strict";

        var settings = jQuery.extend({
                strokeWidth: 1.5,
                height: 200,
                width: $(parameters.element).innerWidth(),
                zoomScaleFactor: 0.9
            }, parameters)
          , features = topojson.feature(settings.topojson,
                                        settings.topojson.objects[parameters.name])

        if (parameters.projection) {
            var dataPath = d3.geo.path().projection(projection = parameters.projection)
        } else {
            var b = d3.geo.bounds(features)
              , projection = d3.geo.mercator()
                                   .scale(1)
                                   .center([(b[1][0] + b[0][0]) / 2,
                                            (b[1][1] + b[0][1]) / 2])
              , dataPath = d3.geo.path().projection(projection)
              , bounds = dataPath.bounds(features)
              , dx = bounds[1][0] - bounds[0][0]
              , dy = bounds[1][1] - bounds[0][1]
              , scale = 0.9 * (settings.width / dx)

            settings.height = dy * settings.width / dx

            projection.scale(scale)
                      .translate([settings.width / 2, settings.height / 2/* + topMargin*/])
        }

        $(this).height(settings.height) //FIXME: Introduce topMargin again

        function init() {
            var svg = d3.select(settings.element).append("svg")
                        .attr("width", settings.width)
                        .attr("height", settings.height/* + topMargin*/)

            svg.append("rect")
                    .attr("class", "map-background")
                    .attr("width", settings.width)
                    .attr("height", settings.height)

            var g = svg.append("g")
                       .attr("class", "map-polygonGroup")
                       .style("stroke-width", settings.strokeWidth + "px")
                       .selectAll("path")
                       .data(features.features)
                       .enter().append("path")
                       .attr("class", "map-polygon")
                       .attr("d", dataPath)
                       .style("fill", settings.fillCallback)

            //Prevent another call to the init method
            this.init = function() {}
        }

        this.init = init
        this.features = function() { return features }
        this.path = function()  { return dataPath }
        this.parameters = function() { return settings }
    }

    ZoomableMap = function(parameters) {
        var staticMap = new StaticMap(parameters)
          , settings = $.extend({
                selectCallback: function(d) {}
            }, staticMap.parameters())
          , selected
          , group

        function init() {
            staticMap.init()

            var svg = d3.select(parameters.element + " svg")

            svg.select(".map-background")
               .on("click", zoomOut);

            svg.selectAll(".map-polygon")
               .on("click", zoomIn)
               .on("mouseover", function(d, i) {
                   //TODO: Set stroke color dynamically here, not in css
                   d3.select(this).classed("map-polygon--active", true);
                })
               .on("mouseout", function(d, i) {
                    d3.select(this).classed("map-polygon--active", false);
               });

            group = svg.select(".map-polygonGroup");

            //$(parentSelector + ".map-clearButton").on("click", zoomHome);
        }

        function zoomOut() {
            selected = undefined

            group.transition()
                .duration(500)
                .style("stroke-width", settings.strokeWidth + "px")
                .attr("transform", "")

            settings.selectCallback(undefined)
        }

        function zoomIn(d) {
            if (selected == d || d == undefined) {
                zoomOut()
                return
            }
            selected = d

            var bounds = staticMap.path().bounds(d),
                dx = bounds[1][0] - bounds[0][0],
                dy = bounds[1][1] - bounds[0][1],
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                scale = settings.zoomScaleFactor /
                        Math.max(dx / settings.width, dy / settings.height),
                translate = [settings.width / 2 - scale * x,
                             settings.height / 2 - scale * y/* + topMargin*/],
                strokeWidthScaled = Math.max(0.01, settings.strokeWidth / scale)

            group.transition()
                 .duration(500)
                 .attr("transform", "translate(" + translate + ")scale(" + scale + ")")
                 .style("stroke-width", strokeWidthScaled + "px")

            settings.selectCallback(selected)
        }

        this.init = init
        this.settings = function() { return settings }
    }
}()
