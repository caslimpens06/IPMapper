﻿namespace Casus_Security.Model
{
	public class IP
	{
		private string _protocol;
		private string _localAddress;
		private string _foreignAddress;
		private string _state;
		private double _latitude;
		private double _longitude;
		private string _location;
		private string _applicationName;

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

		public string ApplicationName
        {
            get { return _applicationName; }
            set { _applicationName = value; }
        }

        public IP(string protocol, string localaddress, string foreignaddress, string state, string applicationname)
		{
			_protocol = protocol;
			_localAddress = localaddress;
			_foreignAddress = foreignaddress;
			_state = state;
            _applicationName = applicationname;
        }

		public IP(string foreignaddress) 
		{
			_foreignAddress = foreignaddress;
		}

		public IP() { }
	}
}
