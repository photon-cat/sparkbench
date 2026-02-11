// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT173.
    /// </summary>
    public class HCT173:ClockedChip
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hc173.pdf

        private const double TYP_PROPAGATION_DELAY = 17;

        #region Protected Fields
        protected Pin FF0;
        protected Pin FF1;
        protected Pin FF2;
        protected Pin FF3;
        //protected bool LastEnable;
        #endregion Protected Fields

        #region Input Pins
        public Pin OE1n;
        public Pin OE2n;
        public Pin E1n;
        public Pin E2n;

        public Pin D0;
        public Pin D1;
        public Pin D2;
        public Pin D3;
        #endregion Input Pins

        #region Output Pins
        public Pin Q0;
        public Pin Q1;
        public Pin Q2;
        public Pin Q3;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT173(string Name) : this(Name, null, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT173(string Name, Net NetCP, Net NetMR, Net NetOE1n, Net NetOE2n, Net NetE1n, Net NetE2n, Net NetD0, Net NetD1, Net NetD2, Net NetD3) : base(Name, "CP", "7", NetCP, "MR", "15", NetMR, SignalState.H)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.OE1n = new Pin(this, "OE1n", "1", LineMode.In, SignalState.L, NetOE1n);
            this.OE2n = new Pin(this, "OE2n", "2", LineMode.In, SignalState.L, NetOE2n);
            this.E1n = new Pin(this, "E1n", "9", LineMode.In, SignalState.L, NetE1n);
            this.E2n = new Pin(this, "E2n", "10", LineMode.In, SignalState.L, NetE2n);
            this.D0 = new Pin(this, "D0", "14", LineMode.In, SignalState.L, NetD0);
            this.D1 = new Pin(this, "D1", "13", LineMode.In, SignalState.L, NetD1);
            this.D2 = new Pin(this, "D2", "12", LineMode.In, SignalState.L, NetD2);
            this.D3 = new Pin(this, "D3", "11", LineMode.In, SignalState.L, NetD3);

            this.FF0 = new Pin(this, "FF0", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF1 = new Pin(this, "FF1", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF2 = new Pin(this, "FF2", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.FF3 = new Pin(this, "FF3", "", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            this.Q0 = new Pin(this, "Q0", "3", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q1 = new Pin(this, "Q1", "4", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q2 = new Pin(this, "Q2", "5", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q3 = new Pin(this, "Q3", "6", LineMode.BiDir, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[5][];
            SetPinArray(Inputs, 0, this.CLK);
            SetPinArray(Inputs, 1, this.RST);
            SetPinArray(Inputs, 2, new Pin[] { this.OE1n, this.OE2n });
            SetPinArray(Inputs, 3, new Pin[] { this.E1n, this.E2n });
            SetPinArray(Inputs, 4, new Pin[] { this.D0, this.D1, this.D2, this.D3 });

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, new Pin[] { this.Q0, this.Q1, this.Q2, this.Q3 });
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
            //LastEnable = true;
            SetOutputStates(SignalState.L);
        }

        /// <summary>
        /// Called on the rising edge of the clock to count or load.
        /// </summary>
        /// <param name="Time"></param>
        protected override void RisingEdge(double Time)
        {
#if DEBUG_WRITE
			Debug.WriteLine("Time=" + Time.ToString() + ",LineStates=" + I1D.State.ToString() + "," + I2D.State.ToString() + "," + I3D.State.ToString() + "," + I4D.State.ToString() + "," + I5D.State.ToString() + "," + I6D.State.ToString() + "," + I7D.State.ToString() + "," + I8D.State.ToString());
#endif
            if (RST.State == ResetState)
                return;

            //if (Time > 8200)
            //    Debug.WriteLine("");

            if ((E1n.State == SignalState.L) && (E2n.State == SignalState.L))
            {
                FF0.SetOutState(D0.State);
                FF1.SetOutState(D1.State);
                FF2.SetOutState(D2.State);
                FF3.SetOutState(D3.State);

                if ((OE1n.State == SignalState.L) && (OE2n.State == SignalState.L))
                {
                    Q0.NewOutState = D0.State;
                    Q1.NewOutState = D1.State;
                    Q2.NewOutState = D2.State;
                    Q3.NewOutState = D3.State;
                }
            }
            SetOutputChangeTime(Time);
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            if (RST.State == ResetState)
                return;

            //if (Time > 8200)
            //    Debug.WriteLine("");

            if ((OE1n.State == SignalState.L) && (OE2n.State == SignalState.L))
            {
                //if (LastEnable == false)
                {
                    Q0.NewOutState = FF0.State;
                    Q1.NewOutState = FF1.State;
                    Q2.NewOutState = FF2.State;
                    Q3.NewOutState = FF3.State;
                    //LastEnable = true;
                }
            }
            else
            {
                //if (LastEnable == true)
                {
                    Q0.NewOutState = SignalState.Z;
                    Q1.NewOutState = SignalState.Z;
                    Q2.NewOutState = SignalState.Z;
                    Q3.NewOutState = SignalState.Z;
                    //LastEnable = false;
                }
            }
        }
        #endregion Public Methods

    }
}
