import './style.css'
import * as d3 from 'd3'

function csv_data_popdensity(csv_data, year) {

    const data = new Map();
    const years = new Set();
    const top = new Map();
    const t = new Map();

    csv_data.forEach((d) => {
        const code_density = {
            [d["Code"]]: +d["Population density"]
        };

        if (!data.has(d.Year)) {
            data.set(d.Year, new Map());
            top.set(d.Year, []);
        }

        data.get(d.Year).set(d.Code, +d["Population density"]);
        top.get(d.Year).push([d.Code, +d["Population density"], d.Entity])
    });

    for (const year of top.keys()) {
        top.get(year).sort((a, b) => b[1] - a[1]);
        for (let i = 0; i < Math.min(20, top.get(year).length); i++) {
            if (!t.has(year)) {
                t.set(year, [])
            }
            t.get(year).push([
                top.get(year)[i][0],
                top.get(year)[i][1],
                top.get(year)[i][2],
            ]);
        }
    }

    return {
        data: data,
        years: [...data.keys()].map(key => +key),
        top: t,
    };

}

function addLegend(svg, colorScale, width, height) {
    const legendWidth = 300;
    const legendHeight = 10;

    const legendData = colorScale.domain();
    const legendGroup = svg.append("g")
        .attr("transform", `translate(${width / 2 - legendWidth / 2}, ${height - 40})`);

    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");

    colorScale.range().forEach((color, i) => {
        gradient.append("stop")
            .attr("offset", `${(i / (colorScale.range().length - 1)) * 100}%`)
            .attr("stop-color", color);
    });

    legendGroup.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    const xScale = d3.scaleLinear()
        .domain([legendData[0], legendData[legendData.length - 1]])
        .range([0, legendWidth]);

    const axisBottom = d3.axisBottom(xScale)
        .tickSize(6)
        .ticks(6)
        .tickFormat(d => d);

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(axisBottom)
        .select(".domain").remove();
}

function plot_horizontal_bar(width, height, data) {

    let margin = {top: 20, right: 30, bottom: 40, left: 90};
    width = width - margin.left - margin.right;
    height = height - margin.top - margin.bottom;

    const tooltip = d3.select(".tooltip");

    const svg = d3.select("#ranking-graph").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
          `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear()
    .domain([0, data[0][1]])
    .range([0, width])

    svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end")

    const y = d3.scaleBand()
    .range([0, height])
    .domain(data.map((d, i) => {
        return d[0];
    }))
    .padding(.1);

    svg.append("g")
    .call(d3.axisLeft(y));

    svg.selectAll("bar-rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", x(0))
    .attr("y", (d) => { return y(d[0]); })
    .attr("width", (d) => { return x(d[1]); })
    .attr("height", y.bandwidth())
    .attr("fill", "#69b3a2")
    .on("mouseover", (event, d) => {
        d3.selectAll(".Country")
        .style("opacity", 0.2);

        d3.select(`#map-${d[0]}`)
        .style("opacity", 1)
        .style("stroke", "black")
        .style("stroke-width", "2");

        const countryName = d[2];
        const density = d[1].toFixed(2);
        tooltip.style("display", "block")
        .html(`<strong>${countryName}</strong><br>Density: ${density}`);
    })
    .on("mousemove", (event, d) => {
        const path_pos = document.getElementById(`map-${d[0]}`);
        const rect = path_pos.getBoundingClientRect();
        const X = rect.left;
        const Y = rect.top;
        tooltip.style("top", (Y + 15) + "px")
        .style("left", (X + 15) + "px");
    })
    .on("mouseleave", (event, d) => {
        d3.selectAll(".Country")
        .style("opacity", 1)
        .style("stroke", "transparent")
        .style("stroke-width", 0);

        tooltip.style("display", "none");
    });
}

function plot_choroplethmap(svg, width, height, geojson_data, data) {
    const g = svg.append("g");

    const path = d3.geoPath();
    const projection = d3.geoMercator()
    .scale(150)
    .center([0, 0])
    .translate([width / 2, height / 2]);

    const colorScale = d3.scaleThreshold()
    .domain([0, 10, 20, 50, 100, 200, 500, 1000])
    .range(d3.schemeReds[8]);

    const tooltip = d3.select(".tooltip");


    g.selectAll("path")
    .data(geojson_data.features)
    .enter()
    .append("path")
    .attr("d", d3.geoPath().projection(projection))
    .attr("fill", function (d) {
        d.total = data.get(d.properties.ISO_A3) || 0;
        return colorScale(d.total);
    })
    .style("stroke", "transparent")
    .attr("class", function(d){ return "Country" } )
    .attr("id", function(d){ return `map-${d.properties.ISO_A3}`})
    .on("mouseover", (event, d) => {
        d3.select(event.target)
        .transition()
        .duration(200)
        .style("opacity", 1)
        .style("stroke", "black")
        .style("stroke-width", "1");

        const countryName = d.properties.ADMIN;
        let density = data.get(d.properties.ISO_A3) || "No data";
        if (typeof density === "number") {
            density = density.toFixed(2);
        }
        tooltip.style("display", "block")
        .html(`<strong>${countryName}</strong><br>Density: ${density}`);
    })
    .on("mousemove", (event, d) => {
        tooltip.style("top", (event.pageY + 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseleave", (event, d) => {
        d3.select(event.target)
        .transition()
        .duration(100)
        .style("stroke", "transparent")
        .style("stroke-width", 0);

        tooltip.style("display", "none");
    });


    const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
    });

    svg.call(zoom);
}

function updateChoroplethMap(svg, geojson_data, map_data, colorScale) {

    const tooltip = d3.select(".tooltip");

    svg.selectAll("path")
        .data(geojson_data.features)
        .attr("fill", function (d) {
            d.total = map_data.get(d.properties.ISO_A3) || 0;
            return colorScale(d.total);
        })
        .style("stroke", "transparent")
        .attr("class", "Country")
        .attr("id", function(d){ return `map-${d.properties.ISO_A3}`})
        .on("mouseover", (event, d) => {
            d3.select(event.target)
            .transition()
            .duration(200)
            .style("opacity", 1)
            .style("stroke", "black")
            .style("stroke-width", "1");

            const countryName = d.properties.ADMIN;
            let density = map_data.get(d.properties.ISO_A3) || "No data";
            if (typeof density === "number") {
                density = density.toFixed(2);
            }
            tooltip.style("display", "block")
            .html(`<strong>${countryName}</strong><br>Density: ${density}`);
        });
}

async function main() {
    const json_data = await d3.json("countries.geojson");
    const csv_data = await d3.csv("population-density.csv");

    const year = 2024;
    const data = csv_data_popdensity(csv_data, year);

    data.years.sort(function(a, b) { return a - b });

    const slider = document.getElementById("year-slider");
    slider.min = 0;
    slider.max = data.years.length - 1;
    slider.value = data.years.indexOf(year);

    const header_year = document.querySelector("#description > h2 > #year");
    header_year.textContent = data.years[slider.value];

    const width : number = 1024;
    const height : number = 576;

    const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

    const density_data = data.data.get(year.toString());
    plot_choroplethmap(svg, width, height, json_data, density_data);

    const colorScale = d3.scaleThreshold()
        .domain([0, 10, 20, 50, 100, 200, 500, 1000])
        .range(d3.schemeReds[8]);

    addLegend(svg, colorScale, width, height);


    const bar_graph_box = document.querySelector("#description");
    const bar_graph_width = bar_graph_box.offsetWidth;

    // there are some empty string which I will skip so lets pass 20
    plot_horizontal_bar(bar_graph_width, 576, data.top.get(year.toString()));


    slider.addEventListener("input", (event) => {
        const selectedYear = data.years[+event.target.value];
        const updatedData = data.data.get(selectedYear.toString());
        updateChoroplethMap(svg, json_data, updatedData, colorScale);
        header_year.textContent = data.years[slider.value];

        const barGraphContainer = d3.select("#ranking-graph");
        barGraphContainer.selectAll("*").remove(); // Clear the old bar graph

        plot_horizontal_bar(bar_graph_width, 576, data.top.get(selectedYear.toString()));
    });
}

main();

