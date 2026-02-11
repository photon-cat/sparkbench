// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT273.
    /// </summary>
	public class HCT273 : ClockedChip
	{
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hct273.pdf

        private const double TYP_PROPAGATION_DELAY = 12;

        #region Input Pins
		public Pin I1D;
        public Pin I2D;
		public Pin I3D;
		public Pin I4D;
		public Pin I5D;
		public Pin I6D;
		public Pin I7D;
		public Pin I8D;
        #endregion Input Pins

        #region Output Pins
        public Pin O1Q;
		public Pin O2Q;
		public Pin O3Q;
		public Pin O4Q;
		public Pin O5Q;
		public Pin O6Q;
		public Pin O7Q;
		public Pin O8Q;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT273(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT273(string Name, Net NetCLK, Net NetCLRn, Net NetI1D, Net NetI2D, Net NetI3D, Net NetI4D, Net NetI5D, Net NetI6D, Net NetI7D, Net NetI8D) : base(Name,"CLK","11", NetCLK, "CLRn","1", NetCLRn)
		{
            this.Power[0] = new Pin(this,  "VCC", "20");
            this.Ground[0] = new Pin(this, "GND", "10");

			this.I1D = new Pin(this, "1D",  "3", LineMode.In, SignalState.L, NetI1D);
			this.I2D = new Pin(this, "2D",  "4", LineMode.In, SignalState.L, NetI2D);
			this.I3D = new Pin(this, "3D",  "7", LineMode.In, SignalState.L, NetI3D);
			this.I4D = new Pin(this, "4D",  "8", LineMode.In, SignalState.L, NetI4D);
			this.I5D = new Pin(this, "5D", "13", LineMode.In, SignalState.L, NetI5D);
			this.I6D = new Pin(this, "6D", "14", LineMode.In, SignalState.L, NetI6D);
			this.I7D = new Pin(this, "7D", "17", LineMode.In, SignalState.L, NetI7D);
			this.I8D = new Pin(this, "8D", "18", LineMode.In, SignalState.L, NetI8D);

			this.O1Q = new Pin(this, "1Q",  "2", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O2Q = new Pin(this, "2Q",  "5", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O3Q = new Pin(this, "3Q",  "6", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O4Q = new Pin(this, "4Q",  "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O5Q = new Pin(this, "5Q", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O6Q = new Pin(this, "6Q", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O7Q = new Pin(this, "7Q", "16", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
			this.O8Q = new Pin(this, "8Q", "19", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

			Inputs = new Pin[3][];
			SetPinArray(Inputs, 0, this.CLK);
			SetPinArray(Inputs, 1, this.RST);
			SetPinArray(Inputs, 2, new Pin[] { this.I1D, this.I2D, this.I3D, this.I4D, this.I5D, this.I6D, this.I7D, this.I8D });
			//DatabusIn = new Pin[1][];
			//SetPinArray(DatabusIn, 0, new Pin[] { this.I1D, this.I2D, this.I3D, this.I4D, this.I5D, this.I6D, this.I7D, this.I8D });

			Outputs = new Pin[1][];
			SetPinArray(Outputs, 0, new Pin[] {this.O1Q, this.O2Q, this.O3Q, this.O4Q, this.O5Q, this.O6Q, this.O7Q, this.O8Q});
			//DatabusOut = new Pin[1][];
			//SetPinArray(DatabusOut, 0, new Pin[] {this.O1Q, this.O2Q, this.O3Q, this.O4Q, this.O5Q, this.O6Q, this.O7Q, this.O8Q });
			ResetChip();
		}
        #endregion Constructors

        #region Private/Protected Methods
		/// <summary>
		/// Reset the chip.
		/// </summary>
        protected override void ResetChip()
        {
            base.ResetChip();
            SetOutputStates(SignalState.L);
        }

        /// <summary>
        /// Called on the rising edge of the clock to load.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void RisingEdge(double Time)
        {
#if DEBUG_WRITE
			Debug.WriteLine("Time=" + Time.ToString() + ",LineStates=" + I1D.State.ToString() + "," + I2D.State.ToString() + "," + I3D.State.ToString() + "," + I4D.State.ToString() + "," + I5D.State.ToString() + "," + I6D.State.ToString() + "," + I7D.State.ToString() + "," + I8D.State.ToString());
#endif
            O1Q.NewOutState = I1D.State;
            O2Q.NewOutState = I2D.State;
            O3Q.NewOutState = I3D.State;
            O4Q.NewOutState = I4D.State;
            O5Q.NewOutState = I5D.State;
            O6Q.NewOutState = I6D.State;
            O7Q.NewOutState = I7D.State;
            O8Q.NewOutState = I8D.State;
            SetOutputChangeTime(Time);
        }
        #endregion Private/Protected Methods

    }
}
