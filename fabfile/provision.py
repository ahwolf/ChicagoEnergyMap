"""
Functions for provisioning environments with fabtools (eat shit puppet!)
"""
# standard library
import sys
import copy
import os
from distutils.util import strtobool

# 3rd party
import fabric
from fabric.api import env, task, local, run, settings, cd, sudo, lcd
import fabtools
from fabtools.vagrant import vagrant_settings

# local
import decorators
import utils

@task
@decorators.needs_environment
def apt_get_update(max_age=86400*7):
    """refresh apt-get index if its more than max_age out of date
    """
    with vagrant_settings(env.host_string):
        try:
            fabtools.require.deb.uptodate_index(max_age=max_age)
        except AttributeError:
            msg = (
                "Looks like your fabtools is out of date. "
                "Try updating fabtools first:\n"
                "    sudo pip install fabtools==0.17.0"
            )
            raise Exception(msg)

@task
@decorators.needs_environment
def python_packages():
    """install python packages"""
    filename = os.path.join(utils.remote_project_root(), "REQUIREMENTS")
    with vagrant_settings(env.host_string):
        fabtools.require.python.requirements(filename, use_sudo=True)


@task
@decorators.needs_environment
def debian_packages():
    """install debian packages"""
    
    # get the list of packages
    filename = os.path.join(utils.project_root(), "REQUIREMENTS-DEB")
    with open(filename, 'r') as stream:
        packages = stream.read().strip().splitlines()

    # install them all with fabtools.
    with vagrant_settings(env.host_string):
        fabtools.require.deb.packages(packages)


@task
@decorators.needs_environment
def packages():
    """install all packages"""
    debian_packages()
    python_packages()


@task
@decorators.needs_environment
def setup_analysis():
    """prepare analysis environment"""
    pass
    # with vagrant_settings(env.host_string):
        
    #     # write a analysis.ini file that has the provider so we can
    #     # easily distinguish between development and production
    #     # environments when we run our analysis
    #     template = os.path.join(
    #         utils.fabfile_templates_root(), 
    #         "server_config.ini",
    #     )
    #     fabtools.require.files.template_file(
    #         path="/vagrant/server_config.ini",
    #         template_source=template,
    #         context=env,
    #     )

    #     # create a data directory where all of the analysis and raw
    #     # data is stored. 
    #     data_dir = "/vagrant/data"
    #     fabtools.require.files.directory(data_dir)

@task
@decorators.needs_environment
def setup_django(do_rsync=True):
    """setup django"""
        
    with vagrant_settings(env.host_string):

        # extract necessary configuration variables from INI file
        parser = utils.get_config_parser()
        mysql_root_password = parser.get('mysql', 'root_password')
        django_username = parser.get('mysql', 'django_root_username')
        django_password = parser.get('mysql', 'django_root_password')
        django_db = parser.get('mysql', 'django_database')
        facebook_id = parser.get('social', 'FACEBOOK_APP_ID')

        # setup mysql
        fabtools.require.mysql.server(password=mysql_root_password)
        with settings(mysql_user='root', mysql_password=mysql_root_password):
            fabtools.require.mysql.user(django_username, django_password)
            fabtools.require.mysql.database(django_db,owner=django_username)

        # write the local django settings. since local.py is listed in
        # the .hgignore, the -C option to rsync must ignore it. this
        # needs to go AFTER rsyncing

        # rsync directory to get all models, views, etc into the
        # /srv/www directory.
        #
        # TODO: Use a soft link to the figures/templates directory to
        # avoid unnecessary rsyncing of data from analysis?
        site_name = "chicagoenergy.datascopeanalytics.com"
        web_dir = "Map"
        site_root = os.path.join("/srv", "www", site_name, web_dir)
        fabtools.require.directory(site_root, owner="www-data", use_sudo=True)
        if do_rsync:
            sudo("rsync -avC --exclude='*.hg' /vagrant/%s %s" % (
                web_dir, os.path.dirname(site_root)
            ))


        for root_dir in ["/vagrant/" + web_dir, site_root]:
            # make sure the dir exists (for the site_root one)
            target_dir = root_dir+"/Map/settings/"
            fabtools.require.directory(target_dir, owner="www-data", use_sudo=True)
            # use_sudo is necessary (for the site_root one)
            fabtools.require.files.template_file(
                path=root_dir+"/Map/settings/local.py",
                template_source=os.path.join(
                    utils.fabfile_templates_root(), "django_settings.py"
                ),
                context={
                    "django_db": django_db,
                    "django_username": django_username,
                    "django_password": django_password,
                    "FACEBOOK_APP_ID": facebook_id,
                },
                use_sudo=True,
            )

        # collect the static files
        with cd("/vagrant/Map"):
            run("./manage.py collectstatic --noinput")

        # make sure permissions are set up properly
        #sudo("chmod -R a+w %s" % site_root)
        sudo("chmod -R g+w %s" % site_root)
        sudo("chgrp -R www-data %s" % site_root)

        # # make sure permissions are set up properly
        # #sudo("chmod -R a+w %s" % site_root)
        # sudo("chmod -R g+w %s" % site_root)
        # sudo("chgrp -R www-data %s" % site_root)
            
        # make sure database is up and running
        with cd("/vagrant/Map"):
            run("./manage.py syncdb --noinput")
            run("./manage.py migrate")

        # setup apache
        # fabtools.require.apache.module_enabled("mod_wsgi") # __future__
        config_filename = os.path.join(
            utils.fabfile_templates_root(), 
            "apache.conf",
        )
        fabtools.require.apache.site(
            'chicagoenergy.datascopeanalytics.com',
            template_source=config_filename,
            wsgi_application_group=r"%{GLOBAL}",
            site_name=site_name,
            site_root=site_root,
        )
        fabtools.require.apache.disabled('default')


@task(default=True)
@decorators.needs_environment
def default(do_rsync=True):
    """run all provisioning tasks"""
    # http://stackoverflow.com/a/19536667/564709
    if isinstance(do_rsync, (str, unicode,)):
        do_rsync = bool(strtobool(do_rsync))

    # rsync files (Vagrant isn't doing any provisioning now)
    if do_rsync:
        local("vagrant provision %(host_string)s" % env)

    # run all of these provisioning tasks in the order specified here
    apt_get_update()

    # install debian packages first to make sure any compiling python
    # packages have necessary dependencies
    packages()

    # set up anything that needs to be done prior to running the
    # analysis via make
    setup_analysis()
