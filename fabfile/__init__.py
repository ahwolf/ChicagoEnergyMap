# 3rd party
from fabric.api import env, task

# local
import utils
import vagrant
import provision

@task
def dev():
    """define development server"""
    env.provider = "virtualbox"
    utils.set_hosts_from_config()

@task
def digital():
    """define digital ocean server"""
    env.provider = "digital_ocean"
    utils.set_hosts_from_config()