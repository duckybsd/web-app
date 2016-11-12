cd '/home/amnesia/Tor Browser'

# read sudo pass

#echo -n "Sudo Password: "
#read -s pass

# update the apt repos
sudo apt-get update

# download iceweasel
wget -c http://security.debian.org/debian-security/pool/updates/main/i/iceweasel/iceweasel_38.8.0esr-1~deb8u1_i386.deb

# install it and then fix apt
sudo dpkg -i iceweasel_38.8.0esr-1~deb8u1_i386.deb
sudo apt-get install -fy

# add udev rules
sudo su - root -c 'echo '"'"'ACTION=="add|change", SUBSYSTEM=="usb", ATTRS{idVendor}=="03eb", ATTRS{idProduct}=="204f", MODE="0666", GROUP="plugdev"'"'"' > /etc/udev/rules.d/90-bitlox.rules'

# then chmod them
sudo chmod 644 /etc/udev/rules.d/90-bitlox.rules

# then reloadd udev to apply the new rules
sudo /etc/init.d/udev restart

# download the firefox plugin
wget -c http://bitlox2twvzwbzpk.onion/bitlox_hardware_wallet/tails/nphidapiBrowserPlugin.xpi

