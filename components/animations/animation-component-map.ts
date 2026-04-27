import { DhcpAnimation } from "./dhcp-animation"
import { DnsAnimation } from "./dns-animation"
import { ArpAnimation } from "./arp-animation"
import { EthernetAnimation } from "./ethernet-animation"
import { FtpAnimation } from "./ftp-animation"
import { HttpHttpsAnimation } from "./http-https-animation"
import { IcmpAnimation } from "./icmp-animation"
import { IpBasicAnimation } from "./ip-basic-animation"
import { IpEncapsulationAnimation } from "./ip-encapsulation-animation"
import { IpHopByHopAnimation } from "./ip-hop-by-hop-animation"
import { IpRouteAnimation } from "./ip-route-animation"
import { OsiTcpIpAnimation } from "./osi-tcp-ip-animation"
import { PppAnimation } from "./ppp-animation"
import { Pop3Animation } from "./pop3-animation"
import { SmtpAnimation } from "./smtp-animation"
import { SshAnimation } from "./ssh-animation"
import { TcpAnimation } from "./tcp-animation"
import { TcpVsUdpAnimation } from "./tcp-vs-udp-animation"
import { TftpAnimation } from "./tftp-animation"
import { UdpAnimation } from "./udp-animation"
import { CsmaCdAnimation } from "./csma-cd-animation"

export const animationComponentMap = {
  arp: ArpAnimation,
  "csma-cd": CsmaCdAnimation,
  dhcp: DhcpAnimation,
  dns: DnsAnimation,
  ethernet: EthernetAnimation,
  ftp: FtpAnimation,
  "http-https": HttpHttpsAnimation,
  icmp: IcmpAnimation,
  "ip-basico": IpBasicAnimation,
  "ip-encapsulacion": IpEncapsulationAnimation,
  "ip-hop-by-hop": IpHopByHopAnimation,
  "ip-ruta": IpRouteAnimation,
  "osi-tcp-ip": OsiTcpIpAnimation,
  ppp: PppAnimation,
  pop3: Pop3Animation,
  smtp: SmtpAnimation,
  ssh: SshAnimation,
  tcp: TcpAnimation,
  "tcp-vs-udp": TcpVsUdpAnimation,
  tftp: TftpAnimation,
  udp: UdpAnimation,
} as const
