import os
import json
import pickle

from django.shortcuts import render_to_response
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.template import RequestContext
from django.http import HttpResponse
from django.db.models import Sum, Avg
from base.models import CensusBlocks, Neighborhoods, MonthlyEnergy, RealPledge, Initiatives, Email
# from common.conf.settings import STATIC_URL, STATIC_ROOT

from rtree.index import Index
from shapely import wkt
from shapely.geometry import Point, Polygon

from django.views.decorators.clickjacking import xframe_options_exempt

def login_form(request):
    return render_to_response(
        'main/login_form.html', {
        },
        context_instance=RequestContext(request)
    )

# @login_required
@xframe_options_exempt
def serve_city(request):
    
    # create the geojson object
    neighborhood_geojson = {
                "type":"FeatureCollection",
                "features":[]
    }
    # read in neighborhood.json to get the shapes
    neighborhoods = Neighborhoods.objects.all()
    for neighborhood in neighborhoods:
        geo_type = "Polygon"


        neighborhood_shape = wkt.loads(neighborhood.shape)

        # in case of multi polygons
        if neighborhood_shape.type == "MultiPolygon":
            coords = []
            for coord in list(wkt.loads(neighborhood.shape).geoms):
                coords.append([list(coord.exterior.coords)])
            geo_type = "MultiPolygon"
        else:
            coords = [list(wkt.loads(neighborhood.shape).exterior.coords)]

        try:
            feature = {
                "type": "Feature",
                "geometry": {
                        "type":geo_type,
                        "coordinates": coords
                        },
                "properties":{
                        # 'elect': neighborhood.total_kwh,
                        # 'gas': neighborhood.total_therm,
                        # total_energy = total_energy,
                        'elect_efficiency': neighborhood.kwh_efficiency,
                        'gas_efficiency': neighborhood.therm_efficiency,
                        # 'total_sqft': neighborhood.total_sqft,
                        # 'gas_sqft': neighborhood.sqft_therm,
                        # 'elect_sqft': neighborhood.sqft_kwh,
                        'number_of_pledges': neighborhood.number_of_pledges,
                        'pledge_money': neighborhood.pledge_money,
                        'name': neighborhood.name,
                        'elect_rank':neighborhood.kwh_rank,
                        'gas_rank':neighborhood.therm_rank,
                        'elect_percentile':neighborhood.kwh_percentile,
                        'gas_percentile':neighborhood.therm_percentile
                        
                        # 'shape':list(wkt.loads(neighborhood.shape).exterior.coords))
#                            json.dump(neighborhood.shape)
                        }
                }
        except KeyError:
            continue
        neighborhood_geojson['features'].append(feature)

    # dump the geojson and send to the client side
    return_json = json.dumps(neighborhood_geojson)

    # with open('neighborhood_test.js', 'wb') as outfile:
    #    outfile.write("var neighborhood = " + return_json)

    return render_to_response(
        'base/home.html', {
            'project_root': settings.PROJECT_ROOT,
            'neighborhood_geojson': return_json,
            'FACEBOOK_APP_ID': settings.FACEBOOK_APP_ID,
            },
        context_instance=RequestContext(request)
        )

# user selects a neighborhood, we return all of the census blocks for that
# neighborhood
def serve_neighborhood(request):
    # get the name
    neighborhood_name = request.GET['name']
    building_subtype = request.GET['building_subtype']
    location = request.GET.getlist('loc[]')
    
    location = [float(location[0]), float(location[1])]
    neighborhood = Neighborhoods.objects.get(name = neighborhood_name)
    census_blocks = CensusBlocks.objects.filter(neighborhood = neighborhood,
                                                building_type = 'Residential',
                                                building_subtype = building_subtype
                                                )
    metrics = CensusBlocks.objects.filter(neighborhood = neighborhood,
                                          building_type = 'Residential',
                                          building_subtype = building_subtype
                                          ).aggregate(Avg('kwh_efficiency'),
                                                      Avg('therm_efficiency')
                                          )
    census_block_geojson = create_census_json(census_blocks, location, metrics)
    census_block_geojson['centroid'] = list(wkt.loads(neighborhood.shape).centroid.coords)[0]
    # import pdb
    # pdb.set_trace()
    # dump the geojson and send to the client side
    return_json = json.dumps(census_block_geojson)

    return HttpResponse(return_json,mimetype="application/json")

# Takes an address and returns the neighborhood and census block
def find_census_block(request):


    point = Point(float(request.GET.get('lon')), float(request.GET.get('lat')))

    # use point in polygon for all of the neighborhoods seemed more accurate
    neighborhoods = Neighborhoods.objects.all()
    # neighborhood_dict = {}

    # check to see whether a neighborhood was found, if so then neighborhood
    # is the correct neighborhood. Used point in polygon instead of rtree
    # since rtree was returning funny results.
    found_neighborhood = False
    for neighborhood in neighborhoods:
        if point.within(wkt.loads(neighborhood.shape)):

            found_neighborhood = True
            break
        # neighborhood_dict[neighborhood.name] = wkt.loads(neighborhood.shape)
    # recieved an invalid address
    if found_neighborhood == False:
        return HttpResponse("", mimetype="text/plain")
    else:
        return HttpResponse(neighborhood.name, mimetype="text/plain")
    # # neighborhood_dict =pickle.load(open(BOUNDARY_DATA + "community_test.p", 'rb'))
    # # BOUNDARY_DATA = STATIC_ROOT + '/main/'
    # # print "before si"
    # # neighborhood_si = create_spatial_index(neighborhood_dict)

    # # print "before"
    # # matched_neighborhoods = neighborhood_si.nearest(point.bounds, 1,objects=True)
    # # print matched_neighborhoods
    # # for nei in matched_neighborhoods:
    # #     print dir(nei)
    # #     print nei.object
    # # print matched_neighborhoods

    # # once the neighborhood is found, create an rtree of the census blocks
    # # while also creating the geojson

    # census_blocks = CensusBlocks.objects.filter(neighborhood = neighborhood,
    #                                     building_type = 'Residential',
    #                                     building_subtype = 'Single Family')

    # # create a spatial index
    # census_dict = {}

    # for i,census_block in enumerate(census_blocks):
    #     if census_block.shape:
    #         census_dict[census_block.census_id] = Polygon(json.loads(census_block.shape))
    # census_block_si = create_spatial_index(census_dict)

    # matched_census = census_block_si.nearest(point.bounds, 1, objects=True)

    # # find the census id of the matched census block
    # for match in matched_census:
    #     census_id = match.object
    #     break

    # # create the json to send back to the client
    # census_json = create_census_json(census_blocks)

    # census_json['properties'] = census_id
    # response = json.dumps(census_json)
    # return HttpResponse(response, mimetype="application/json")

# pass in a query set and choose whether or not the shape file should be
# loaded with wkt or json
def create_census_json(census_blocks, location, metrics, WKT=True):

    census_block_geojson = {
            "type":"FeatureCollection",
            "features":[]
    }

    # Go through each census block 
    middle_rank = len(census_blocks)/2
    for census_block in census_blocks:
        if census_block.shape:

            # Are we using the wkt method or json method of storing?
            if WKT:
                # shape = wkt.dumps(census_block.shape)
                # print shape
                coords = [list(wkt.loads(census_block.shape).exterior.coords)]
            else:
                coords = [json.loads(census_block.shape)]

            if not census_block.nice_address:
                nice_address = census_block.census_id
            else:
                nice_address = census_block.nice_address


            if census_block.kwh_efficiency:
                kwh_efficiency = census_block.kwh_efficiency
                kwh_rank = census_block.kwh_rank
            else:
                kwh_efficiency = metrics['kwh_efficiency__avg']
                kwh_rank = 0#middle_rank


            if census_block.therm_efficiency:
                therm_efficiency = census_block.therm_efficiency
                therm_rank = census_block.therm_rank
            else:
                therm_efficiency = metrics['therm_efficiency__avg']
                therm_rank = 0#middle_rank

            # check if point is in polygon
            point = Point(location)
            #print point, census_block.shape
            if point.within(wkt.loads(census_block.shape)):
                chosen = True
            else:
                chosen = False

            # Put it into geojson format
            feature = {
                    "type": "Feature",
                    "geometry": {
                            "type":"Polygon",
                            "coordinates": coords
                            },
                    "properties":{
                            # 'elect': census_block.total_kwh,
                            # 'gas': census_block.total_therm,
                            # total_energy = total_energy,
                            'elect_efficiency': kwh_efficiency,
                            'gas_efficiency': therm_efficiency,
                            # 'total_sqft': census_block.total_sqft,
                            # 'gas_sqft': census_block.sqft_therm,
                            # 'elect_sqft': census_block.sqft_kwh,
                            'name': census_block.census_id,
                            'elect_rank':kwh_rank,
                            'gas_rank':therm_rank,
                            'elect_percentile':census_block.kwh_percentile,
                            'gas_percentile':census_block.therm_percentile,
                            'nice':nice_address,
                            'chosen': chosen
                            }
                    }
            census_block_geojson['features'].append(feature)

    # dump the geojson and send to the client side
    return census_block_geojson

# returns random initiatives back to the client
def get_pledge_info(request):
    initiative_list = []
    # changed logic still return things, don't care about user
    initiatives_shown = 3
    subtype = request.GET.get("subtype")
    user = request.user
    # get a random order of initiatives
    if subtype == "multi lt7":
        initiatives = Initiatives.objects.filter(multi_lt7 = True).order_by('?')
    elif subtype == "multi gt7":
        initiatives = Initiatives.objects.filter(multi_gt7 = True).order_by('?')
    else:
        initiatives = Initiatives.objects.filter(single_family = True).order_by('?')

    for initiative in initiatives:
            # append to the json to return to the user
        initiative_list.append({"name":initiative.name,
                               "savings": initiative.savings})
        if len(initiative_list) == initiatives_shown:
            break
    response = json.dumps(initiative_list);
    return HttpResponse(response,mimetype="application/json")

# receive pledge
def receive_pledge(request):

    # check building subtype, right now we are grouping <7 with 7+
    subtype = request.GET.get('subtype')
    names = request.GET.getlist('name[]')
    for name in names:

        if subtype == "Single Family Home":
            initiative = Initiatives.objects.get(name = name,
                                                 single_family = True)
        else:
            initiative = Initiatives.objects.get(name = name,
                                                 multi_lt7 = True)
        # get the neighborhood

        neighborhood = Neighborhoods.objects.get(name = request.GET.get("neighborhood"))
        # store the pledge
        # remove this when you have time, this is a straight hack
        census_block = CensusBlocks.objects.get(id = 100)
        realPledge, created = RealPledge.objects.get_or_create(neighborhood = neighborhood,
                                                               initiative = initiative,
                                                               census_block = census_block)

    return HttpResponse("fuck", "text/plain")
 
# ajax request for the leaderboard to be displayed
def leaderboard(request):
    amount = 10
    neighborhoods = Neighborhoods.objects.all()
    leader_list = []
    for neighborhood in neighborhoods:
        pledges = RealPledge.objects.filter(neighborhood = neighborhood)
        total = pledges.aggregate(Sum('initiative__savings'))
        # leader_list.append([neighborhood.name,amount['initiative__savings__sum']])

        count = len(pledges)
        if not total['initiative__savings__sum']:
            total['initiative__savings__sum'] = '0'
        leader_list.append([neighborhood.name,count, total['initiative__savings__sum']])

    leader_list = sorted(leader_list, key = lambda leader:leader[1], reverse = True)
    leader_list = leader_list[:amount]
    return HttpResponse(json.dumps(leader_list), "application/json")


def about(request):
    return render_to_response(
        'main/about.html', {
        },
        context_instance=RequestContext(request)
    )

def email_entry(request):
    email, created = Email.objects.get_or_create(email=request.GET.get('email'))
    return HttpResponse("fuck you","text/plain")

def create_spatial_index(shape_dict):

    spatial_index = Index()
    for index, (name, shape) in enumerate(shape_dict.iteritems()):
        spatial_index.insert(index, shape.bounds, obj=name)
    return spatial_index

