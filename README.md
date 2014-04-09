Getting started
---------------

* Install [Vagrant](http://vagrantup.com),
  [Fabric](http://fabric.readthedocs.org/en/1.8/installation.html),
  and [fabtools](http://fabtools.readthedocs.org/en/latest/).

* Rename config.ini.sample to config.ini and change as follows:
  * project name (currently called chicagoEnergy)
  * root_password - this is the root mysql password for the box
  * django\_root\_password - root password for the django db
  * django\_username\_password - root username for the django db
  * django_database - name of the django db
  * enter a facebook app_id

* Put in any python or other unix tools you want in REQUIREMENTS or REQUIREMENTS-DEB

* ```fab dev vagrant.up provision``` _This will create a virtual machine with all the necessary packages._

* ```fab dev provision.setup_django``` _This will setup mysql and database for django_

* Grab the database file from dropbox! https://www.dropbox.com/s/em7m1pje6vne1ut/chicagoEnergy.sql

* SSH to the virtual machine with `vagrant ssh $(Your Project Name)`

* ```cd /vagrant/PROJECT_NAME``` Change directory to manage.py location

* ```python manage.py dbshell < /location/of/chicagoEnergy.sql``` update your database with census block shape files and energy information

* ```python manage.py runserver 0.0.0.0:8000``` Create a webserver, then redirect your browser to 0.0.0.0:8000 and enjoy!

##### Questions? drop me a line at aaron.wolf@datascopeanlaytics.com or leave an issue.
