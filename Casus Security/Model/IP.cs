using System.Text.Json.Serialization;

namespace Casus_Security.Model
{
	internal class IP
	{
		private string _protocol;
		private string _localAddress;
		private string _foreignAddress;
		private string _state;
		private double _latitude;
		private double _longitude;
		private string _location;
		private int _port;

		public string Protocol
		{
			get { return _protocol; }
			set { _protocol = value; }
		}

		public string LocalAddress
		{
			get { return _localAddress; }
			set { _localAddress = value; }
		}

		public string ForeignAddress
		{
			get { return _foreignAddress; }
			set { _foreignAddress = value; }
		}

		public string State
		{
			get { return _state; }
			set { _state = value; }
		}

		public int Port
		{
			get { return _port; }
			set { _port = value; }
		}

		[JsonPropertyName("loc")]
		public string Location
		{
			get { return _location; }
			set { _location = value; }
		}
		public double Latitude
		{
			get { return _latitude; }
			set { _latitude = value; }
		}

		public double Longitude
		{
			get { return _longitude; }
			set { _longitude = value; }
		}

		public IP(string protocol, string localaddress, string foreignaddress, string state, int port)
		{
			_protocol = protocol;
			_localAddress = localaddress;
			_foreignAddress = foreignaddress;
			_state = state;
			_port = port;
			_location = "";
		}

		public IP() { }
	}
}
