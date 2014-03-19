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

* ```fab dev vagrant.up provision``` _This will create a virtual machine with all the necessary packages._

* ```fab dev provision.setup\_django``` _This will setup mysql and database for django_

* SSH to the virtual machine with `vagrant ssh $(Your Project Name)`

