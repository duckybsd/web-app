echo 'KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0666", GROUP="plugdev"' > /etc/udev/rules.d/99-hidraw-permissions.rules
echo 'ACTION=="add|change", SUBSYSTEM=="usb", ATTRS{idVendor}=="03eb", ATTRS{idProduct}=="204f", MODE="0666", GROUP="plugdev"' > /etc/udev/rules.d/90-bitlox.rules
chmod 644 /etc/udev/rules.d/90-bitlox.rules
/etc/init.d/udev restart


