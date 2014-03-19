# from django.conf.urls.defaults import *
from django.conf.urls import url, patterns, include
import views

# social authentication (this should be the first page people see
urlpatterns = patterns(
    '',
    url(r'', include('social_auth.urls')),
    # url(settings.LOGIN_URL[1:]+'$', views.login_form, name="login_form"),
    url(r'login-form/$', views.login_form, name="login_form"),
)

urlpatterns += patterns(
    '',

    url(r'^$', views.serve_city, name="neighborhoods"),
    url(r'^neighborhood/$',views.serve_neighborhood, name="census_blocks"),
    url(r'^find_census_block/$',views.find_census_block, name="find_census_block"),
    url(r'^pledge/$',views.get_pledge_info, name="pledge"),
    url(r'^give_pledge/$',views.receive_pledge, name="give_pledge"),
    url(r'^leaderboard/$',views.leaderboard, name="leaderboard"),
    url(r'^auth/$',views.receive_pledge, name="auth"),
    url(r'^email_entry/$',views.email_entry, name="email_entry"),
)

