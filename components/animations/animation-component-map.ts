import { ArpAnimation } from "./arp-animation"
import { EthernetAnimation } from "./ethernet-animation"
import { IcmpAnimation } from "./icmp-animation"
import { IpBasicAnimation } from "./ip-basic-animation"
import { IpEncapsulationAnimation } from "./ip-encapsulation-animation"
import { IpHopByHopAnimation } from "./ip-hop-by-hop-animation"
import { IpRouteAnimation } from "./ip-route-animation"
import { OsiTcpIpAnimation } from "./osi-tcp-ip-animation"
import { PppAnimation } from "./ppp-animation"
import { TcpAnimation } from "./tcp-animation"
import { TcpVsUdpAnimation } from "./tcp-vs-udp-animation"
import { UdpAnimation } from "./udp-animation"

export const animationComponentMap = {
  arp: ArpAnimation,
  ethernet: EthernetAnimation,
  icmp: IcmpAnimation,
  "ip-basico": IpBasicAnimation,
  "ip-encapsulacion": IpEncapsulationAnimation,
  "ip-hop-by-hop": IpHopByHopAnimation,
  "ip-ruta": IpRouteAnimation,
  "osi-tcp-ip": OsiTcpIpAnimation,
  ppp: PppAnimation,
  tcp: TcpAnimation,
  "tcp-vs-udp": TcpVsUdpAnimation,
  udp: UdpAnimation,
} as const
