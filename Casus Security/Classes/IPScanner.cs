using System;
using System.Collections.Generic;
using System.Diagnostics;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	internal class IPScanner
	{
		private List<IP> ipList;

		public IPScanner()
		{
			ipList = new List<IP>();
		}

		public void ImportIpsFromNetstat()
		{
			ProcessStartInfo processStartInfo = new ProcessStartInfo
			{
				FileName = "netstat",
				Arguments = "-n",
				RedirectStandardOutput = true,
				UseShellExecute = false,
				CreateNoWindow = true
			};

			using (Process process = Process.Start(processStartInfo))
			{
				if (process == null)
				{
					Console.WriteLine("Failed to start netstat process.");
					return;
				}

				string output = process.StandardOutput.ReadToEnd();
				ParseOutgoingIpsFromNetstatOutput(output);
			}
		}

		private void ParseOutgoingIpsFromNetstatOutput(string netstatOutput)
		{
			string[] lines = netstatOutput.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);

			foreach (string line in lines)
			{
				if (line.StartsWith("Proto"))
				{
					continue;
				}

				string[] columns = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

				if (columns.Length > 4)
				{
					string protocol = columns[0];
					string localAddress = columns[1];
					string foreignAddress = columns[2];
					string state = columns[3];

					string[] addressParts = foreignAddress.Split(':');
					string ip = addressParts[0];

					if (!ipList.Exists(ipObj => ipObj.ForeignAddress == foreignAddress))
					{
						ipList.Add(new IP(protocol, localAddress, foreignAddress, state));
					}
				}
			}
		}

		public List<IP> GetIpList()
		{
			return ipList;
		}
	}
}
