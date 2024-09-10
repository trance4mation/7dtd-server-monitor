# 7DTD Monitor (JS version)

## Setup
```
curl -fsSL https://bun.sh/install | bash
bun install
```

## Troubleshooting

### Can't install `dockerode`
When you encounter an error while installing dependencies, such as:
```
TypeError: Executable not found in $PATH: "cc"
error: install script from "cpu-features" exited with 1
```
you may be missing the GCC compiler in your system. To add it, follow these steps:
```
sudo apt-get update
sudo apt-get install gcc
```
and then try it again.