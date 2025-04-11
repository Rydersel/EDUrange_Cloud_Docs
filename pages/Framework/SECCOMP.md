# Seccomp Profile System in EDURange

## Overview

The EDURange instance-manager implements a dynamic seccomp (Secure Computing Mode) profile system to enhance container security. This system automatically applies appropriate system call restrictions to different container types based on their requirements, following the principle of least privilege.

## What is Seccomp?

Seccomp is a Linux kernel feature that restricts the system calls a process can make, effectively limiting its ability to interact with the kernel. By restricting available system calls to only those necessary for the container's operation, we reduce the potential attack surface and enhance security.

## Implementation Details

### Directory Structure

```
instance-manager/
├── seccomp_profiles/
│   ├── webos.json       # Profile for WebOS containers
│   └── terminal.json    # Profile for terminal containers
└── challenge_utils/
    └── k8s_resources.py # Profile application logic
```

### Profile Application Logic

The system automatically:
1. Identifies container types based on image names
2. Locates corresponding seccomp profiles
3. Applies profiles through Kubernetes pod annotations

```python
# Example of how profiles are applied
annotations[f"container.seccomp.security.alpha.kubernetes.io/{container_name}"] = seccomp_profile
```

## Profile Types

### WebOS Profile
- Basic system calls needed for Node.js web application
- Network operations
- File system access
- Process management
- Memory management
- IPC operations

### Terminal Profile
Additional capabilities for terminal operations:
- `ptrace` for debugging
- `personality` for binary compatibility
- `capget/capset` for capability management
- `chroot` for changing root directory

## Security Benefits

1. **Reduced Attack Surface**
   - Only necessary system calls are allowed
   - Default deny policy for undefined calls
   - Container-specific restrictions

2. **Defense in Depth**
   - Complements existing container security
   - Mitigates impact of potential exploits
   - Enforces principle of least privilege

3. **Standardization**
   - Consistent security across deployments
   - Documented security boundaries
   - Maintainable security profiles

## Profile Structure

Each profile follows this format:
```json
{
    "defaultAction": "SCMP_ACT_ERRNO",
    "architectures": ["SCMP_ARCH_X86_64", "SCMP_ARCH_X86", "SCMP_ARCH_AARCH64"],
    "syscalls": [
        {
            "names": ["syscall1", "syscall2", ...],
            "action": "SCMP_ACT_ALLOW",
            "args": []
        }
    ]
}
```

- `defaultAction`: Deny all syscalls by default
- `architectures`: Supported CPU architectures
- `syscalls`: List of explicitly allowed system calls

## Integration with Challenge Deployment

1. **Profile Detection**
   ```python
   seccomp_profile = get_seccomp_profile_for_image(image_name)
   ```

2. **Pod Creation**
   ```python
   if seccomp_profile:
       annotations[f"container.seccomp.security.alpha.kubernetes.io/{container_name}"] = seccomp_profile
   ```

3. **Resource Application**
   - Profiles are applied during pod creation
   - Each container can have its own profile
   - Profile paths are resolved dynamically

## Best Practices

1. **Profile Management**
   - Keep profiles in version control
   - Document changes and reasons
   - Regular security reviews

2. **Testing**
   - Validate profiles in development
   - Monitor for blocked syscalls
   - Test with different workloads

3. **Maintenance**
   - Update profiles with application changes
   - Monitor for security impacts
   - Document profile modifications

## Future Enhancements

1. **Profile Generation**
   - Automated profile generation based on container behavior
   - Integration with security scanning tools
   - Dynamic profile adjustment

2. **Monitoring**
   - Syscall monitoring and logging
   - Security event alerting
   - Performance impact tracking

3. **Integration**
   - Additional container types
   - Custom profile support
   - Enhanced profile management

## Troubleshooting

### Common Issues

1. **Container Startup Failures**
   - Check for missing required syscalls
   - Review container logs for blocked calls
   - Verify profile path resolution

2. **Runtime Errors**
   - Monitor for ERRNO responses
   - Check for missing syscalls
   - Validate profile syntax

### Debugging Steps

1. Verify profile existence and path
2. Check container logs for seccomp violations
3. Review required syscalls for the application
4. Test with permissive profile temporarily
5. Add missing syscalls as needed

## References

- [Kubernetes Seccomp Documentation](https://kubernetes.io/docs/tutorials/security/seccomp/)
- [Docker Seccomp Security Profiles](https://docs.docker.com/engine/security/seccomp/)
- [Linux Seccomp Security](https://man7.org/linux/man-pages/man2/seccomp.2.html)

## Kubernetes Cluster Requirements

### Prerequisites

1. **Kubernetes Version**
   - Kubernetes 1.19+ for stable seccomp support
   - 1.22+ recommended for latest security features

2. **Node Configuration**
   - Seccomp must be enabled in the kubelet configuration
   - The seccomp profile directory must exist on all nodes:
     ```bash
     /var/lib/kubelet/seccomp/
     ```

3. **Container Runtime**
   - Container runtime must support seccomp (Docker, containerd, CRI-O)
   - Runtime must be configured to allow custom seccomp profiles

### Cluster Setup

1. **Kubelet Configuration**
   ```yaml
   # /var/lib/kubelet/config.yaml
   seccompDefault: true  # Enable seccomp by default
   seccompProfileRoot: /var/lib/kubelet/seccomp/
   ```

2. **Profile Distribution**
   - Profiles must be present on all nodes
   - Use a DaemonSet to distribute profiles:
   ```yaml
   apiVersion: apps/v1
   kind: DaemonSet
   metadata:
     name: seccomp-profile-installer
     namespace: kube-system
   spec:
     selector:
       matchLabels:
         name: seccomp-profile-installer
     template:
       metadata:
         labels:
           name: seccomp-profile-installer
       spec:
         containers:
         - name: installer
           image: busybox
           command: ["sh", "-c", "cp /profiles/* /host-profiles/ && sleep infinity"]
           volumeMounts:
           - name: host-profiles
             mountPath: /host-profiles
           - name: profiles
             mountPath: /profiles
         volumes:
         - name: host-profiles
           hostPath:
             path: /var/lib/kubelet/seccomp
         - name: profiles
           configMap:
             name: seccomp-profiles
   ```

3. **Profile ConfigMap**
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: seccomp-profiles
     namespace: kube-system
   data:
     webos.json: |
       {contents of webos.json}
     terminal.json: |
       {contents of terminal.json}
   ```

### Verification

1. **Check Node Configuration**
   ```bash
   # Check kubelet configuration
   sudo cat /var/lib/kubelet/config.yaml | grep seccomp

   # Verify profile directory exists
   ls /var/lib/kubelet/seccomp/
   ```

2. **Test Profile Application**
   ```bash
   # Create test pod with seccomp profile
   kubectl apply -f test-pod.yaml

   # Check pod security context
   kubectl get pod test-pod -o yaml | grep seccomp
   ```

3. **Monitor for Issues**
   ```bash
   # Check pod events
   kubectl describe pod test-pod

   # Check container runtime logs
   sudo journalctl -u containerd
   ```

### Troubleshooting Cluster Setup

1. **Profile Loading Issues**
   - Verify profile paths on nodes
   - Check DaemonSet status
   - Validate profile syntax
   - Check node permissions

2. **Runtime Errors**
   - Review container runtime logs
   - Check kubelet logs
   - Verify profile permissions
   - Validate profile format

3. **Pod Creation Failures**
   - Check pod security context
   - Verify annotation format
   - Review pod events
   - Check node capacity
