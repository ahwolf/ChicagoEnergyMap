Getting started
---------------

* Install [Vagrant](http://vagrantup.com),
  [Fabric](http://fabric.readthedocs.org/en/latest/installation.html),
  and [fabtools](http://fabtools.readthedocs.org/en/latest/).

* Change config.ini as follows:
  * project name (currently called chicagoEnergy)
  * root_password - this is the root mysql password for the box
  * django\_root\_password - root password for the django db
  * django\_username\_password - root username for the django db
  * django_database - name of the django db


* Put in any python or other unix tools you want in REQUIREMENTS or REQUIREMENTS-DEB

* From the command line, run `fab dev vagrant.up provision`. This will
  create a virtual machine with all the necessary packages.

* SSH to the virtual machine with `vagrant ssh $(Your Project Name)`

* $ 
* 
* $ python manage.py migrate
* $ python manage.py runserver
