import requests
import json

base_url = "http://maps.googleapis.com/maps/api/geocode/json?latlng={},{}&sensor=false"

with open("DAHdata2.json") as infile:
    json_to_geolocate = json.load(infile)

for i, violation_data in enumerate(json_to_geolocate["data"]):
    lat = violation_data[37][1]
    lon = violation_data[37][2]
    county = ""
    country = ""
    answer = requests.get(base_url.format(lat,lon))
    for component in answer.json()["results"][0]["address_components"]:

        if component["types"][0] == "administrative_area_level_2":
            county = component["long_name"]
        if component["types"][0] == "country":
            country = component["long_name"]
        if component["types"][0] == "locality":
            city = component["long_name"]
        if component["types"][0] == "administrative_area_level_1":
            state = component["long_name"]

    if city == "Detroit":
        pie_chart_name = "Detroit"
    elif county in ("Wayne County", "Macomb County", "Oakland County"):
        pie_chart_name = country
    elif state == "Michigan":
        pie_chart_name = state
    elif country == "United States":
        pie_chart_name = country
    else
        pie_chart_name = "International"

    
    violation_data +=[county, country, pie_chart_name]
    if i % 100 == 0:
        print "Finished geolocating %s out of %s" %(i, len(json_to_geolocate["data"]))

with open("DAHdata_county_country.json", "w") as outfile:
    json.dump(violation_data, outfile)